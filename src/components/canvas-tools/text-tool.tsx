import * as React from "react";
import { observer, inject } from "mobx-react";
import { Change, Value } from "slate";
import { Editor } from "slate-react";
import { ToolTileModelType } from "../../models/tools/tool-tile";
import { TextContentModelType } from "../../models/tools/text/text-content";

import "./text-tool.sass";
import { BaseComponent } from "../base";

interface IState {
  value: Value;
}
​
interface IProps {
  model: ToolTileModelType;
  readOnly?: boolean;
}

@inject("stores")
@observer
export default class TextToolComponent extends BaseComponent<IProps, IState> {
  public componentWillMount() {
    const { model: { content } } = this.props;
    if (content.type === "Text") {
      this.setState({ value: content.convertSlate() });
    }
  }

  public render() {
    const { model, readOnly } = this.props;
    const { content } = model;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `text-tool ${editableClass}`;
    const value = (readOnly && this.state)
      ? this.state.value
      : (content as TextContentModelType).convertSlate();

    return (
      <Editor
        key={model.id}
        className={classes}
        readOnly={readOnly}
        value={this.state.value}
        onChange={this.onChange}
      />
    );
  }

  public onChange = (change: Change) => {
    const { readOnly, model } = this.props;
    const { content } = model;
    const { ui } = this.stores;
    const op = change.operations.get(0);
    if (op.type === "set_selection") {
      ui.setSelectedTile(model);
    }
    if (content.type === "Text") {
      if (!readOnly) {
        content.setSlate(change.value);
      }
      this.setState({ value: change.value });
    }
  }
}
