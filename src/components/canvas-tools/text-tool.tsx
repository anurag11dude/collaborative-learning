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

  public onChange = (change: Change) => {
    const { readOnly, model: { content } } = this.props;
    const { ui } = this.stores;
    // console.log(change.operations.get(0).type);
    if (change.operations.get(0).type === "set_selection") {
      ui.setSelectedTile(this.props.model);
    }
    if (content.type === "Text") {
      if (readOnly) {
        this.setState({
          value: change.value
        });
      }
      else {
        content.setSlate(change.value);
      }
    }
  }

  public render() {
    const { model, readOnly } = this.props;
    const { ui } = this.stores;
    const { content } = model;
    const editableClass = this.props.readOnly ? "read-only" : "editable";
    const selectedClass = ui.selectedTile && ui.selectedTile.id === model.id ? "selected" : "";
    const classes = `text-tool ${editableClass} ${selectedClass}`;
    const value = (readOnly && this.state)
      ? this.state.value
      : (content as TextContentModelType).convertSlate();
    return (
      <Editor
        key={model.id}
        className={classes}
        readOnly={readOnly}
        value={value}
        onChange={this.onChange}
        onCopy={this.onCopy}
      />
    );
  }

  private onCopy = (e: Event, change: Change) => {
    // console.log("Event " + e);
    // console.log("Change: " + change);
  }
}
