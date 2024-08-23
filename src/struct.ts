import * as S from "superstruct";
import isEmail from "is-email";

export const CreateUser = S.object({
  email: S.define<string>("Email", isEmail as S.Validator),
  password: S.string(),
  name: S.string(),
});

export const PatchUser = S.partial(CreateUser);
