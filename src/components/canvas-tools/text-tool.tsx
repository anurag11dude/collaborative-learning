import * as React from "react";
import { observer, inject } from "mobx-react";
import { Change, Value } from "slate";
import { Editor } from "slate-react";
import { ToolTileModelType } from "../../models/tools/tool-tile";
import { TextContentModelType } from "../../models/tools/text/text-content";

import "./text-tool.sass";
import { BaseComponent } from "../base";
import { model } from "mobx-state-tree/dist/internal";
import { userInfo } from "os";

interface IState {
  value: Value;
}
​
interface IProps {
  model: ToolTileModelType;
  readOnly?: boolean;
}

/*
 * This comment to be removed once we're done with development of the
 * initial clipboard functionality. For our first work we have some working
 * definitions and assumptions. The assumptions are numbered.
 *
 * 1. For now, we are not concerned with drag-and-drop. Only copy, paste, and
 * at the tool-level, delete. (If desired, cut is always something that can
 * be composed by a copy-delete.)
 *
 * Selection can be at either the tool-level or at a primitive level, inside
 * a tool. For example, one might click on an area of the page that contains
 * a text-tool. If so, that particular text-tool will be selected. Previously
 * selected tools are unselected. We talk about primitive selections, later.
 *
 * 2. When a tool is selected, (at the moment, the only tool is the text-tool)
 * we visually indicate it is selected, by rendering with a pink background.
 * This rendering will be finalized when we know exactly how we want it to look.
 *
 * A tool maybe be in various clipboard-related selection states -- it may be:
 *
 *    *  not selected,
 *    *  singly selected, or
 *    *  one (of two or more) selected tools.
 *
 * 3. For now, we only support single selection which means at any one time,
 * either no tool or only 1 tool may be selected -- in other words there will
 * either be 1 tool with a pink background; or none.
 *
 * A parallel notion in this model is the idea of the "active" tool. There
 * can only be zero or 1 active tools at any one time.  The active tool is the
 * tool that has the keyboard focus, or contains another sub-component that
 * has the keyboard focus. In other words, it's the tool getting keyboard
 * input and the copy and paste events.
 *
 * Tools in read-only canvas can only be selected, and may not be active. When
 * a tool is selected in an read/write canvas, it is, for now, the only selected
 * tool and is also the only active tool.
 *
 * So, for now, we need not implement a list of selected tools and, instead
 * implement the idea of a single "selectedTile". It needs to be owned by a
 * container of the tool so it needed to be at the canvas, workspace, document,
 * or ui level. Since we don't think the selection state is anything that would
 * be seen by other users (say, in 4-up), nor saved in the database, we have
 * wedged it into the ui model. If those assumptions change, this will likely
 * mean this state (and other stuff) will need to be moved from the ui model
 * and into a more apropos object.
 *
 * 4. Ergo, single selection is implemented in the ui model, in a property called
 * "selectedTile" which is either the id of a toolTile that can be set with
 * "setSelectedTile" or "clearSelectedTile". No selection is indidcated when
 * the selectedTile is unknown.
 *
 * 5. Selection behavior is implemented like this:
 *
 *    * At launch, nothing is selected.
 *    * Any shift of focus will cause the new target tool's tile to become
 *      selected. Since only one can be selected, previously selected ones should
 *      no longer render w/ pink background.
 *
 */

@inject("stores")
@observer
export default class TextToolComponent extends BaseComponent<IProps, IState> {

  public render() {
    const { model, readOnly } = this.props;
    const { ui } = this.stores;
    const { content } = model;
    const editableClass = this.props.readOnly ? "read-only" : "editable";
    const selectedClass = ui.isSelectedTile(model) ? "selected" : "";
    const classes = `text-tool ${editableClass} ${selectedClass}`;
    const value = (readOnly && this.state)
      ? this.state.value
      : (content as TextContentModelType).convertSlate();
    // console.log('TextToolComponent:render() content -> ' + content);

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

  private onChange = (change: Change) => {
    const { readOnly, model: { content, id } } = this.props;
    const { ui } = this.stores;
    const op = change.operations.get(0);
    // console.log('TextToolComponent:onChange() key -> ' + this.context);
    if (op.type === "set_selection") {
      // console.log('TextToolComponent:onChange() set_selection -> ' + op.selection);
      ui.setSelectedTile(this.props.model);
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
        if (ui.isSelectedTile(this.props.model)) {
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
