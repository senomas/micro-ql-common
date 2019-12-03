import { ObjectType, Field } from "type-graphql";

@ObjectType()
export class Commit {
  @Field()
  public hash: string;

  @Field()
  public abbrevHash: string;

  @Field()
  public subject: string;

  @Field()
  public authorName: string;

  @Field()
  public authorDate: Date;
}

@ObjectType()
export class ServerInfo {
  @Field()
  public host: string;

  @Field()
  public time: Date;

  @Field()
  public buildTime: Date;

  @Field(type => [Commit])
  public commits: Commit[];

  @Field(type => [Error], { nullable: true })
  public errors: Error[];
}

@ObjectType()
export class Error {
  @Field({ nullable: true })
  public path: string;

  @Field({ nullable: true })
  public name: string;

  @Field({ nullable: true })
  public value: string;
}
