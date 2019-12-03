import * as fs from 'fs';
import * as os from 'os';
import { Ctx, Query, Resolver } from 'type-graphql';

import { ServerInfo } from '../schemas/common';

@Resolver()
export class CommonResolver {

  @Query(returns => ServerInfo)
  public common(@Ctx() ctx): ServerInfo {
    const data = JSON.parse(fs.readFileSync("./dist/build.json").toString());
    return {
      host: os.hostname(),
      time: new Date(),
      buildTime: new Date(data.buildTime),
      commits: data.commits
        ? data.commits.map(v => ({
          ...v,
          authorDate: new Date(v.authorDate)
        }))
        : null,
      errors: ctx.errors.length > 0 ? ctx.errors : null
    };
  }
}
