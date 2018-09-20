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

  public onChange = (change: Change) => {
    const { readOnly, model: { content } } = this.props;
    if (content.type === "Text") {
      if (!readOnly) {
        content.setSlate(change.value);
      }
      this.setState({ value: change.value });
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
    // console.log('TextToolComponent:render() content -> ' + content);

    return (
      <Editor
        key={model.id}
        className={classes}
        readOnly={readOnly}
        value={this.state.value}
        onChange={this.onChange}
        onCopy={this.onCopy}
      />
    );
  }

  // TODO: Renamed with XXX till new onChange handler, and this logic, can be
  // reconciled.
  private XXXonChange = (change: Change) => {
    const { readOnly, model } = this.props;
    const { content } = model;
    const { ui } = this.stores;
    const op = change.operations.get(0);
    // console.log('TextToolComponent:onChange() key -> ' + this.context);
    if (op.type === "set_selection") {
      // console.log('TextToolComponent:onChange() set_selection -> ' + op.selection);
      ui.setSelectedTile(model);
      // return;  // THIS forced return gets us the selection behavior
                  // we want but kills editing since we never call setSlate.
    }
    // console.log('TextToolComponent:onChange() content -> ' + content);
    if (content.type === "Text") {
      if (readOnly) {
        // console.log('TextToolComponent:OnChange() about to setState -> ' + content);
        this.setState({
          value: change.value
        });
      }
      else {
        // console.log('TextToolComponent:OnChange() about to setSlate ' + content);
        if (ui.isSelectedTile(model)) {
          content.setSlate(change.value);
        }
      }
    }
  }

  private onCopy = (e: Event, change: Change) => {
    // console.log("Event " + e);
    // console.log("Change: " + change);
  }
}
