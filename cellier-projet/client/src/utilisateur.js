import { getUserEmail } from "./auth";

export async function email(cognitoUser) {
  return getUserEmail(cognitoUser);
}
