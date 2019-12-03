const { dest, src } = require("gulp");
const shell = require("shelljs");
const args = require("yargs").argv;
const gitlog = require("gitlog");
const fs = require("fs");
const path = require("path");
const netstat = require('node-netstat');

async function tsc() {
  await shell.exec("npx tsc -p tsconfig.build.json", {
    async: false
  });
}

async function build() {
  await shell.exec("yarn --frozen-lockfile", {
    async: false
  });
  await fix();
  await tsc();
  await copyData();
  const commits = gitlog({
    repo: ".",
    number: 10,
    fields: ["hash", "abbrevHash", "subject", "authorName", "authorDate"]
  });
  fs.writeFileSync(
    "dist/build.json",
    JSON.stringify({ buildTime: new Date(), commits })
  );
}

async function copyData() {
  await new Promise(resolve => {
    src("src/data/*.{json,yaml}")
      .pipe(dest("dist/data"))
      .on("end", resolve);
  });
}

async function dockerUp() {
  await shell.exec("docker-compose -p micro-ql up -d", {
    cwd: "../account",
    async: false
  });
}

async function dockerDown() {
  await shell.exec("docker-compose -p micro-ql down", {
    cwd: "../account",
    async: false
  });
}

async function kill() {
  await killPorts([5000, 5001, 5002])
}

async function run() {
  await dockerUp();
  await build();
  const LOGGER_PATH = path
  shell.exec("node dist/server.js", {
    env: {
      PATH: process.env.PATH,
      LOGGER_PATH: path.resolve("./log"),
      NODE_ENV: "development",
      PORT: 5002
    },
    async: true
  });
  [{ cwd: "../account", port: 5001 }, { cwd: "../federated", port: 5000 }].forEach(async ({ cwd, port }) => {
    shell.exec("npx gulp build", {
      cwd,
      async: false
    });
    shell.exec("node dist/server.js", {
      cwd,
      env: {
        PATH: process.env.PATH,
        LOGGER_PATH: path.resolve("./log"),
        NODE_ENV: "development",
        PORT: port
      },
      async: true
    });
  });
  await waitPorts([5000, 5001, 5002])
}

async function killPorts(ports) {
  const res = {};
  await new Promise((resolve, reject) => {
    netstat({
      filter: {
        state: 'LISTEN'
      },
      done: (err) => {
        if (err) {
          return reject(err)
        }
        resolve()
      }
    }, data => {
      res[data.local.port] = data;
    })
  })
  for (port of ports) {
    if (res[port]) {
      console.log(`kill ${res[port].pid}`);
      await shell.exec(`kill ${res[port].pid}`, {
        async: false
      });
    }
  }
}

async function waitPorts(ports) {
  const expiry = Date.now() + 90000;
  while (true) {
    let res = [];
    await new Promise((resolve, reject) => {
      netstat({
        filter: {
          state: 'LISTEN'
        },
        done: (err) => {
          if (err) {
            return reject(err)
          }
          resolve()
        }
      }, data => {
        res.push(data);
      })
    })
    res = res.filter(data => ports.indexOf(data.local.port) >= 0);
    if (res.length === ports.length) {
      return
    }
    if (expiry < Date.now()) {
      throw `port not ready ${res.map(data => data.local.port)}`
    }
  }
}

async function fix() {
  await shell.exec("tslint --fix --project .", {
    async: false
  });
}

async function test() {
  await kill();
  await shell.exec("rm -rf log dist", {
    async: false
  });
  await run();
  console.log(
    `npx mocha -r ts-node/register ${
    args.bail ? "-b" : ""
    } --color -t 90000 test/**/*${args.mod ? `${args.mod}*` : ""}.spec.ts`
  );
  shell.exec(
    `npx mocha -r ts-node/register  ${
    args.bail ? "-b" : ""
    } --color -t 90000 test/**/*${args.mod ? `${args.mod}*` : ""}.spec.ts`,
    {
      env: {
        PATH: process.env.PATH,
        TEST_SERVER: `http://localhost:5000`
      },
      async: false
    }
  );
  await kill();
}

module.exports = {
  fix,
  tsc,
  copyData,
  build,
  dockerUp,
  dockerDown,
  run,
  kill,
  test
};
