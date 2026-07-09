import bcrypt from "bcryptjs";
import { config } from "../../config";
import prisma from "../../lib/prisma";
import { AppError } from "../../errors/ApiError";
import {
  createOne,
  deleteOne,
  getAll,
  getById,
  updateOne,
} from "../../services/base.service";
import { Role } from "../../generated/prisma/enums";
import {
  UserCreateInput,
  UserUpdateInput,
} from "../../generated/prisma/models";
import { safeUser } from "../../utils/authUtils";
import { User } from "../../generated/prisma/client";

export type SafeUser = Omit<User, "password">;

export const createUser = async (
  payload: UserCreateInput,
): Promise<SafeUser> => {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: payload.email.toLowerCase(),
    },
  });

  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await bcrypt.hash(
    payload.password,
    config.bcrypt.saltRounds,
  );

  const user = await createOne<User>(prisma.user, {
    name: payload.name,
    email: payload.email.toLowerCase(),
    password: hashedPassword,
    role: payload.role ?? Role.ONLINE_SALESMAN,
    phone: payload.phone,
    status: payload.status ?? "ACTIVE",
    image: payload.image,
  } as Partial<User>);

  return safeUser(user);
};

export const getUsers = async (query: Record<string, any>) => {
  const result = await getAll<User>(prisma.user, query, [
    "name",
    "email",
    "phone",
  ]);

  return {
    data: result.data.map(safeUser),
    meta: result.meta,
  };
};

export const getUserById = async (userId: string): Promise<SafeUser> => {
  const user = await getById<User>(prisma.user, userId);
  return safeUser(user);
};

export const updateUserById = async (
  userId: string,
  payload: UserUpdateInput,
): Promise<SafeUser> => {
  const user = await updateOne<User>(prisma.user, userId, {
    name: payload.name,
    phone: payload.phone,
    image: payload.image,
    role: payload.role,
    status: payload.status,
  } as Partial<User>);

  return safeUser(user);
};

export const deleteUserById = async (userId: string): Promise<SafeUser> => {
  const user = await deleteOne<User>(prisma.user, userId);
  return safeUser(user);
};
