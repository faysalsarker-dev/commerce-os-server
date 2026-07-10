import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { AppError } from "./AppError";

export const handlePrismaError = (err: PrismaClientKnownRequestError) => {
  switch (err.code) {

   
    case "P2000":
      const tooLongField = (err.meta?.column_name as string) || "field";
      return new AppError(`Value too long for field: ${tooLongField}.`, 400);

    case "P2001":
      return new AppError("The record you are searching for does not exist.", 404);

    case "P2002":
      const uniqueField = (err.meta?.target as string[])?.join(", ") || "field";
      return new AppError(`Duplicate value for ${uniqueField}. Please use another value.`, 400);

    case "P2003":
      const fkField = (err.meta?.field_name as string) || "field";
      return new AppError(`Invalid reference on field: ${fkField}. The related record does not exist.`, 400);

    case "P2004":
      return new AppError("A database constraint failed. Please check your input.", 400);

    case "P2005":
      // Invalid value for field type stored in database
      const invalidField = (err.meta?.field_name as string) || "field";
      return new AppError(`Invalid value stored in database for field: ${invalidField}.`, 400);

    case "P2006":
      // Invalid value provided for field
      const invalidValueField = (err.meta?.field_name as string) || "field";
      return new AppError(`Invalid value provided for field: ${invalidValueField}.`, 400);

    case "P2007":
      // Data validation error
      return new AppError("Data validation error. Please check your input.", 400);

    case "P2008":
      // Failed to parse query
      return new AppError("Failed to parse the query. Please check your request.", 400);

    case "P2009":
      // Failed to validate query
      return new AppError("Failed to validate the query. Please check your request.", 400);

    case "P2010":
      // Raw query failed
      const rawQueryCode = (err.meta?.code as string) || "unknown";
      return new AppError(`Raw query failed with code: ${rawQueryCode}.`, 500);

    case "P2011":
      // Null constraint violation
      const nullField = (err.meta?.constraint as string) || "field";
      return new AppError(`Null constraint violation on field: ${nullField}. This field is required.`, 400);

    case "P2012":
      // Missing required value
      const missingField = (err.meta?.path as string) || "field";
      return new AppError(`Missing required value for: ${missingField}.`, 400);

    case "P2013":
      // Missing required argument
      const missingArg = (err.meta?.argument_name as string) || "argument";
      return new AppError(`Missing required argument: ${missingArg}.`, 400);

    case "P2014":
      // Relation violation (required relation would be violated)
      const relationName = (err.meta?.relation_name as string) || "unknown";
      return new AppError(`The change would violate a required relation: ${relationName}.`, 400);

    case "P2015":
      // Related record not found
      return new AppError("A related record could not be found.", 404);

    case "P2016":
      // Query interpretation error
      return new AppError("Query interpretation error. Please check your request.", 400);

    case "P2017":
      // Records not connected for relation
      const p2017Relation = (err.meta?.relation_name as string) || "unknown";
      return new AppError(`Records for relation '${p2017Relation}' are not connected.`, 400);

    case "P2018":
      // Required connected records not found
      return new AppError("Required connected records were not found.", 404);

    case "P2019":
      // Input error
      return new AppError("Input error. Please check the data you provided.", 400);

    case "P2020":
      // Value out of range
      const outOfRangeField = (err.meta?.field_name as string) || "field";
      return new AppError(`Value out of range for field: ${outOfRangeField}.`, 400);

    case "P2021":
      // Table does not exist
      const tableName = (err.meta?.table as string) || "unknown";
      return new AppError(`Table '${tableName}' does not exist in the database.`, 500);

    case "P2022":
      // Column does not exist
      const columnName = (err.meta?.column as string) || "unknown";
      return new AppError(`Column '${columnName}' does not exist in the database.`, 500);

    case "P2023":
      // Inconsistent column data
      return new AppError("Inconsistent column data. Please check your database schema.", 500);

    case "P2024":
      // Timed out fetching connection from pool
      return new AppError("Database connection timed out. Please try again later.", 503);

    case "P2025":
      // Record not found
      const cause = (err.meta?.cause as string) || "The requested record was not found.";
      return new AppError(cause, 404);

    case "P2026":
      // Unsupported feature by current database provider
      return new AppError("This operation is not supported by the current database provider.", 400);

    case "P2027":
      // Multiple errors during transaction
      return new AppError("Multiple errors occurred during the database transaction.", 500);

    case "P2028":
      // Transaction API error
      return new AppError("Transaction API error. Please try again.", 500);

    case "P2029":
      // Query parameter limit exceeded
      return new AppError("Query parameter limit exceeded. Please reduce the number of parameters.", 400);

    case "P2030":
      // Fulltext index not found
      return new AppError("Fulltext index not found. Cannot perform fulltext search.", 400);

    case "P2031":
      // MongoDB replica set required
      return new AppError("MongoDB replica set is required for transactions.", 500);

    case "P2033":
      // Number out of range for 64-bit integer
      return new AppError("A number used in the query does not fit into a 64-bit integer.", 400);

    case "P2034":
      // Transaction conflict (write conflict or deadlock)
      return new AppError("Transaction failed due to a write conflict or deadlock. Please retry.", 409);

    case "P2035":
      // Assertion violation on the database
      return new AppError("Assertion violation on the database.", 500);

    case "P2036":
      // External connector error
      return new AppError("Error in external connector. Please check your configuration.", 500);

    case "P2037":
      // Too many connections
      return new AppError("Too many database connections open. Please try again later.", 503);

    // ─── Default ─────────────────────────────────────────────────────────────────

    default:
      return new AppError(`Database error [${err.code}]: ${err.message}`, 500);
  }
};