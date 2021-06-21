import { ConnectionOptions } from "typeorm";

switch (process.env.NODE_ENV) {
  case "development":
  case "staging":
  case "test":
  case "production":
    require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });
    break;
}

const {
  POSTGRES_USERNAME,
  POSTGRES_PASSWORD,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_NAME,
} = process.env;

export const postgres: ConnectionOptions = {
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    `postgres://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_NAME}`,
  synchronize: true,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  logging: false,
  entities: [`${__dirname}/src/entities/**/*.js`],
  migrations: [`${__dirname}/src/migrations/**/*.ts`],
  subscribers: [`${__dirname}/src/subscribers/**/*.js`],
  cli: {
    entitiesDir: `src/entities`,
    migrationsDir: `src/migrations`,
    subscribersDir: `src/subscribers`,
  },
  migrationsRun: false,
  dropSchema: false,
};

module.exports = postgres;
