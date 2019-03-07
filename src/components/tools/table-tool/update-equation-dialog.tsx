import * as React from "react";
import { Button, Dialog } from "@blueprintjs/core";

interface IProps {
  id: string;
  isOpen: boolean;
  onUpdateEquation: (id: string, equation: string) => void;
  onClose: () => void;
  equation: string;
}

interface IState {
  equation: string;
}

export default
class UpdateEquationDialog extends React.Component<IProps, IState> {

  public state = {
            equation: this.props.equation || ""
          };

  public render() {
    const prompt = `Enter an equation for the column in terms of x`;
    return (
      <Dialog
        icon="text-highlight"
        isOpen={this.props.isOpen}
        onClose={this.props.onClose}
        title={`Update Equation`}
        canOutsideClickClose={false}
      >
        <div className="nc-attribute-name-prompt">{prompt}:</div>
        <input
          className="nc-attribute-name-input pt-input"
          type="text"
          maxLength={20}
          placeholder={`Column Equation`}
          value={this.state.equation}
          onChange={this.handleNameChange}
          onKeyDown={this.handleKeyDown}
          dir="auto"
          ref={input => input && input.focus()}
        />
        <div className="nc-dialog-buttons">
          <Button
            className="nc-dialog-button pt-intent-primary"
            text="OK"
            onClick={this.handleRenameAttribute}
          />
          <Button className="nc-dialog-button" text="Cancel"  onClick={this.props.onClose}/>
        </div>
      </Dialog>
    );
  }

  private handleNameChange = (evt: React.FormEvent<HTMLInputElement>) => {
    this.setState({ equation: (evt.target as HTMLInputElement).value });
  }

  private handleRenameAttribute = () => {
    if (this.props.onUpdateEquation) {
      this.props.onUpdateEquation(this.props.id, this.state.equation);
    }
  }

  private handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.keyCode === 13) {
      this.handleRenameAttribute();
    }
  }

}
