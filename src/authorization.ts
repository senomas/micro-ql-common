import { AuthChecker, ForbiddenError, UnauthorizedError } from "type-graphql";

import { logger } from "./services/service";

export const customAuthChecker: AuthChecker<any> = (
  { context, info },
  roles,
) => {
  const ps = [];
  for (let p = info.path; p; p = p.prev) {
    ps.unshift(p.key);
  }
  const path = ps.join(".");
  const user = context.user;
  if (!user) {
    logger.info({ path, user }, "auth-failed");
    context.errors.push({
      path,
      name: "UnauthorizedError"
    });
    return false;
  }
  if (roles.filter(v => !v.startsWith("@")).length === 0) {
    logger.info({ path, user, roles }, "auth-passed");
    return true;
  }
  let pass = false;
  for (let role of roles) {
    if (role.startsWith("!")) {
      role = role.substring(0, -1);
      if (user.p.indexOf(role) < 0) {
        logger.info({ path, user, roles, role }, "auth-failed");
        context.errors.push({
          path,
          name: "ForbiddenError",
          value: JSON.stringify({ roles, role })
        });
        return false;
      }
      pass = true;
    } else if (user.p.indexOf(role) >= 0) {
      pass = true;
    }
  }
  logger.info({ path, user, roles }, pass ? "auth-passed" : "auth-failed");
  if (!pass) {
    context.errors.push({
      path,
      name: "ForbiddenError",
      value: JSON.stringify({ roles })
    });
  }
  return pass;
};
