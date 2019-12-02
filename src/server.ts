import smap = require("source-map-support");
import 'reflect-metadata';
import { ApolloServer, GraphQLExtension } from 'apollo-server-express';
import express from 'express';
import shrinkRay from 'shrink-ray-current';
import { buildSchema } from 'type-graphql';
import fs = require("fs");
import path = require("path");

import { getUser } from './authentication';
import { customAuthChecker } from './authorization';
import { config } from './config';
import { AuthResolver } from './resolvers/auth';
import { MovieResolver } from './resolvers/movie';
import { RoleResolver } from './resolvers/role';
import { UserResolver } from './resolvers/user';
import { LoggerMiddleware } from './services/logger';
import { mongodb } from './services/mongodb';
import { initMovie } from './services/setting';
import { initRole } from './services/role';
import { logger, NODE_ENV } from './services/service';
import { initUser } from './services/user';

smap.install();

class BasicLogging extends GraphQLExtension {
  public requestDidStart(o) {
    logger.info({ query: o.queryString, variables: o.variables }, 'graphql-request');
    o.context.event = {
      dataset: "graphql",
      t: process.hrtime(),
      start: new Date(),
      kind: "event",
      category: "process"
    };
  }

  public willSendResponse({ context, graphqlResponse }) {
    const event = context.event;
    if (event) {
      event.end = new Date();
      const t = process.hrtime(event.t);
      event.duration =  t[0] * 1000000000 + t[1];
      delete event.t;
    }
    logger.info({ gqlRes: graphqlResponse, event }, 'graphql-response');
  }
}

export async function bootstrap() {
  const schema = await buildSchema({
    resolvers: [AuthResolver, RoleResolver, UserResolver, MovieResolver],
    authChecker: customAuthChecker,
    globalMiddlewares: [LoggerMiddleware],
    authMode: "null",
    emitSchemaFile: true,
    dateScalarMode: "isoDate"
  });

  await mongodb.init(config);
  await initUser();
  await initRole();
  await initMovie();

  const data = fs.readdirSync(path.resolve("./dist/data"));
  data.sort();
  const versionRow = (await mongodb.db.collection("version").findOne({ code: "populate" }));
  let version;
  if (versionRow) {
    version = versionRow.version;
  } else {
    version = -1;
    await mongodb.db.collection("version").insertOne({
      code: "populate",
      version
    });
  }
  let lcver = version;
  let cver = version;
  const models = {};
  for (const fn of data) {
    const fns = fn.split(".");
    const model = fns[2];
    cver = parseInt(fns[0], 10);
    if (cver <= version) {
      logger.info({ model, cver, version, fileName: fn }, "skip");
    } else {
      if (lcver < 900 && cver !== lcver) {
        if (cver > 0 && lcver > version) {
          const ures = await mongodb.db.collection("version").updateOne({
            code: "populate",
            version
          }, {
            $set: {
              version: lcver
            }
          }, { upsert: true });
          if (ures.modifiedCount !== 1) {
            delete ures.connection;
            delete ures.message;
            throw {
              name: "UpdateError",
              version,
              cver,
              lcver,
              ures
            };
          }
          version = lcver;
        }
        lcver = cver;
      }
      if (NODE_ENV === "development" || NODE_ENV === "test") {
        if (!models[model]) {
          try {
            await mongodb.db.collection(model).drop();
          } catch (err) {
            if (err.message && err.message.indexOf("ns not found") >= 0) {
              // skip
            } else {
              throw err;
            }
          }
          models[model] = true;
        }
      }
      if (fn.endsWith(".js")) {
        const cfn = `./data/${fn.slice(0, -3)}`;
        logger.info({ model, cver, fileName: cfn }, "import script");
        await require(cfn)({ mongodb });
      } else if (fn.endsWith(".json")) {
        logger.info({ model, cver, fileName: fn }, "load data");
        const pdata = JSON.parse(fs.readFileSync(path.resolve("dist", "data", fn)).toString());
        const res = await mongodb.models[model].load(pdata);
        logger.info({ model, cver, fileName: fn, res }, "load data res");
      }
      logger.info({ version, cver, lcver }, "after update");
    }
  }
  logger.info({ cver, version }, "after updates");
  if (cver < 900 && cver !== version) {
    const ures = await mongodb.db.collection("version").updateOne({
      code: "populate",
      version
    }, {
      $set: {
        version: cver
      }
    }, { upsert: true });
    if (ures.modifiedCount !== 1) {
      delete ures.connection;
      delete ures.message;
      throw {
        name: "UpdateError",
        version,
        lcver,
        cver,
        ures
      };
    }
    version = cver;
  }

  const server = new ApolloServer({
    schema,
    playground: true,
    formatError: err => {
      if (err.message && err.message.startsWith("Context creation failed: ")) {
        err.message = err.message.substr(25);
      }
      return err;
    },
    context: async ({ req }) => {
      const user = await getUser(req);
      const remoteAddress = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
      return { user, headers: req.headers, remoteAddress };
    },
    extensions: [() => {
      return new BasicLogging();
    }]
  });

  const app = express();
  app.use(shrinkRay());
  server.applyMiddleware({ app });

  const port = parseInt(process.env.PORT, 10 || 4000);
  const bindAddress = process.env.BIND_ADDRESS || "0.0.0.0";
  const serverInfo = await app.listen(port, bindAddress);
  logger.info({ port, bindAddress, ...serverInfo }, "Server is running");
}

bootstrap().catch(err => {
  console.error("server error", err);
  process.exit(-1);
});
