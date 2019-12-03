import { Resolver } from "type-graphql";

import { AddSettingInput, FilterSettingInput, Setting, PartialSetting, UpdateSettingInput, OrderBySettingInput } from "../schemas/setting";

import { createBaseResolver } from "./lib";

@Resolver(of => Setting)
export class SettingResolver extends createBaseResolver({
  suffix: "setting",
  typeCls: Setting,
  partialTypeCls: PartialSetting,
  filterInput: FilterSettingInput,
  orderByInput: OrderBySettingInput,
  createInput: AddSettingInput,
  updateInput: UpdateSettingInput
}) {
  constructor() {
    super();
    this.queryFilters.titleRegex = (query, v) => {
      query.title = { $regex: v };
    };
  }
}
