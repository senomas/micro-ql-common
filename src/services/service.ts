import * as bunyan from "bunyan";
import crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import { ApolloError } from "apollo-server-core";

import { config, keyEncoder } from "../config";

export const NODE_ENV = (process.env.NODE_ENV || "production").toLowerCase();

export const appName = "common";
if (config.logger && config.logger.path && !fs.existsSync(config.logger.path)) {
  fs.mkdirSync(config.logger.path);
}
const serializers = {
  req: req => {
    if (!req || !req.connection) {
      return req;
    }
    return {
      method: req.method,
      url: req.originalUrl || req.url,
      headers: req.headers,
      remoteAddress: req.connection.remoteAddress,
      remotePort: req.connection.remotePort
    };
  },
  res: bunyan.stdSerializers.res,
  err: bunyan.stdSerializers.err
};

export const logger = bunyan.createLogger(
  (config.logger && config.logger.path) ? {
    name: appName,
    serializers,
    streams: [{
      type: "rotating-file",
      ...config.logger,
      path: `${process.env.LOGGER_PATH || config.logger.path || "."}/${appName}-${os.hostname()}.log`,
    }]
  } : { name: appName, serializers });
const raw = Buffer.from(keyEncoder.encodePrivate(config.keys[appName].pkey, "pem", "raw"), "hex").toString("base64");
logger.info({ raw, pem: config.keys[appName].pkey }, "keys");

export const moduleKey = crypto.createECDH(config.auth.curves);
moduleKey.setPrivateKey(raw, "base64");

export class ApolloUserNotFoundError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Login failed', 'UserNotFoundError', data);
    Object.defineProperty(this, 'name', { value: 'UserNotFoundError' });
  }
}

export class ApolloInvalidPasswordError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Login failed', 'InvalidPasswordError', data);
    Object.defineProperty(this, 'name', { value: 'InvalidPasswordError' });
  }
}

export class ApolloMultipleSessionError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Login failed', 'MultipleSessionError', data);
    Object.defineProperty(this, 'name', { value: 'MultipleSessionError' });
  }
}

export class ApolloSessionExpiredError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Session already expired', 'SessionExpiredError', data);
    Object.defineProperty(this, 'name', { value: 'SessionExpiredError' });
  }
}

export class ApolloUnknownKeyIDError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Invalid request', 'UnknownKeyIDError', data);
    Object.defineProperty(this, 'name', { value: 'UnknownKeyIDError' });
  }
}

export class ApolloInvalidClientKeyError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Invalid request', 'InvalidClientKeyError', data);
    Object.defineProperty(this, 'name', { value: 'InvalidClientKeyError' });
  }
}

export class ApolloDuplicateEntryError extends ApolloError {
  constructor(data?: Record<string, any>) {
    super('Entry already exist', 'ApolloDuplicateEntryError', data);
    Object.defineProperty(this, 'name', { value: 'ApolloDuplicateEntryError' });
  }
}
