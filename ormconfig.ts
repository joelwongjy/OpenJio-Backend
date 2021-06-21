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
  POSTGRES_DISABLE_SSL,
} = process.env;

if (
  !POSTGRES_USERNAME ||
  !POSTGRES_PASSWORD ||
  !POSTGRES_HOST ||
  !POSTGRES_PORT ||
  !POSTGRES_NAME
) {
  console.log(process.env.NODE_ENV);
  throw new Error("Missing database config!");
}

export const postgres: ConnectionOptions = {
  type: "postgres",
  url:
    process.env.DATABASE_URL ||
    `postgres://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_NAME}`,
  synchronize: true,
  ssl: !POSTGRES_DISABLE_SSL,
  logging: false,
  entities: [`${__dirname}/src/entities/**/*.js`, "src/entities/**/*.ts"],
  migrations: ["src/migrations/**/*.ts"],
  subscribers: [
    `${__dirname}/src/subscribers/**/*.js`,
    "src/subscribers/**/*.ts",
  ],
  cli: {
    entitiesDir: `src/entities`,
    migrationsDir: `src/migrations`,
    subscribersDir: `src/subscribers`,
  },
  migrationsRun: false,
  dropSchema: false,
};

module.exports = postgres;
