import "mocha";
import { expect } from "chai";
import { suite, test } from "mocha-typescript";

import { BaseTest, values } from "./base";

@suite
export class RoleCrudTest extends BaseTest {

  @test
  public async testLogin() {
    await this.postLogin("admin", "dodol123");
  }

  @test
  public async testListRoles() {
    const res = await this.post(`{
      me(ts: "${Date.now() / 1000}") {
        name
        token {
          seq
          token
        }
      }
      roles(skip: 1) {
        total
        items {
          id
          code
          name
          privileges
        }
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    values.items = res.body.data.roles.items;
  }

  @test
  public async testListRolesOrderBy() {
    const res = await this.post(`{
      me(ts: "${Date.now() / 1000}") {
        name
        token {
          seq
          token
        }
      }
      roles(orderBy: { field: name, type: desc }) {
        total
        items {
          id
          code
          name
          privileges
        }
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    expect(res.body.data.roles.items[0].code, res.log).to.eql("staff");
    values.items = res.body.data.roles.items;
  }

  @test
  public async testFindByID() {
    const res = await this.post(`{
      role(id: "${values.items[0].id}") {
        id
        code
        name
        privileges
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
  }

  @test
  public async testListRolesByCode() {
    const res = await this.post(`{
      roles(filter: { code: "admin" }) {
        total
        items {
          id
          code
          name
          privileges
        }
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
  }

  @test
  public async testListRolesByNameRegex() {
    const res = await this.post(`{
      roles(filter: { nameRegex: "a" }) {
        total
        items {
          id
          code
          name
          privileges
        }
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    expect(res.body.data.roles.total, res.log).to.eql(2);
  }

  @test
  public async insertNewRole() {
    const res = await this.post(`mutation {
      createRole(data: {code: "demo", name: "Demo", privileges: ["demo"]}) {
        id
        code
        name
        privileges
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    values.id = res.body.data.createRole.id;
  }

  @test
  public async insertDuplicateRole() {
    const res = await this.post(`mutation {
      createRole(data: {code: "demo", name: "Demo", privileges: ["demo"]}) {
        id
        code
        name
        privileges
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.haveOwnProperty("errors");
    expect(res.body.errors[0].message, res.log).to.eql("Entry already exist");
  }

  @test
  public async updateRole() {
    const res = await this.post(`mutation {
      updateRoles(filter: { id: "${values.id}" }, data: {name: "Demox", privileges: ["demox"]}) {
        matched
        modified
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    expect(res.body.data.updateRoles.modified, res.log).to.eql(1);
  }

  @test
  public async deleteRoles() {
    const res = await this.post(`mutation {
      deleteRoles(filter: { code: "demo" }) {
        deleted
      }
    }`);
    expect(res.status, res.log).to.eql(200);
    expect(res.body, res.log).to.not.haveOwnProperty("errors");
    expect(res.body.data.deleteRoles.deleted, res.log).to.eql(1);
  }
}
