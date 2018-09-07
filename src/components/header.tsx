import { inject, observer } from "mobx-react";
import * as React from "react";
import { BaseComponent, IBaseProps } from "./base";

import "./header.sass";
import { GroupModelType, GroupUserModelType } from "../models/groups";

interface IProps extends IBaseProps {}

@inject("stores")
@observer
export class HeaderComponent extends BaseComponent<IProps, {}> {

  public render() {
    const {user, problem, groups} = this.stores;
    const myGroup = groups.groupForUser(user.id);

    return (
      <div className="header">
        <div className="info">
          <div>
            <div className="problem">{problem.fullTitle}</div>
            <div className="class">{user.className}</div>
          </div>
        </div>
        <div className="group">
          {myGroup ? this.renderGroup(myGroup) : null}
        </div>
        <div className="user">
          <div className="name">{user.name}</div>
        </div>
      </div>
    );
  }

  private renderGroup(group: GroupModelType) {
    return (
      <div>
        <div onClick={this.handleResetGroup} className="name">{`Group ${group.id}`}</div>
        <div className="members">
          {group.users.map((user) => this.renderGroupUser(user))}
        </div>
      </div>
    );
  }

  private renderGroupUser(user: GroupUserModelType) {
    const {connected} = user;
    console.log(user.connectedTimestamp);
    const className = `member ${user.connected ? "connected" : "disconnected"}`;
    const title = user.connected ? `connected` : `disconnected`;
    return (
      <div
        key={user.id}
        className={className}
        title={title}
      >
        {user.initials}
      </div>
    );
  }

  private handleResetGroup = () => {
    if (confirm("Do you want to change groups?")) {
      this.stores.db.leaveGroup();
    }
  }
}
