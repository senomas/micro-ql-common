import { Length, MaxLength } from "class-validator";
import { Field, ID, InputType, Int, ObjectType, registerEnumType } from "type-graphql";

import { Partial, OrderByType } from "./lib";

@ObjectType()
export class Setting {  
  @Field()
  public id: string;

  @Field()
  public code: string;

  @Field()
  public name: string;

  @Field(type => [String], { nullable: true })
  public value: string[];
}

@InputType()
export class AddSettingInput {
  @Field()
  public code: string;

  @Field()
  public name: string;

  @Field(type => [String], { nullable: true })
  public value: string[];
}

@InputType()
export class UpdateSettingInput {
  @Field()
  public code: string;

  @Field()
  public name: string;

  @Field(type => [String], { nullable: true })
  public value: string[];
}

@InputType()
export class FilterSettingInput {
  @Field(type => ID, { nullable: true })
  public id: string;

  @Field({ nullable: true })
  public code: string;

  @Field({ nullable: true })
  public name: string;

  @Field({ nullable: true })
  public nameRegex: string;
}

export enum SettingField {
  id = 'id', code = 'code', name = 'name'
}
registerEnumType(SettingField, { name: 'SettingField' });

@InputType()
export class OrderBySettingInput {
  @Field(type => SettingField)
  field: SettingField;

  @Field(type => OrderByType)
  type: OrderByType;
}

@ObjectType()
export class PartialSetting extends Partial(Setting) {
}
