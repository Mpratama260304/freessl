import pino from "pino";

export const logger = pino({ level: "info", base: undefined, redact: ["privateKey", "accountKey", "csr", "token", "headers", "req", "err", "password", "secret"] });