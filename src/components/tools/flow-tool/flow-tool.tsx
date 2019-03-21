import * as React from "react";
import { BaseComponent } from "../../base";
import { ToolTileModelType } from "../../../models/tools/tool-tile";
import Rete from "rete";
import { Node } from "rete";
import ConnectionPlugin from "rete-connection-plugin";
import VueRenderPlugin from "rete-vue-render-plugin";
import ContextMenuPlugin from "rete-context-menu-plugin";
import Vue from "vue";
import { VuePlugin } from "vuera";

import "./flow-tool.sass";

interface IProps {
  model: ToolTileModelType;
  readOnly: boolean;
  scale?: number;
}

interface IState {
}

if (Vue) {
  Vue.use(VuePlugin);
}

interface IProps {
  update: (newVal: number) => void;
  value: number;
}

interface IState {
}

const numSocket = new Rete.Socket("Number value");

class Hello extends React.Component<IProps, IState> {
  public render() {
    const { update } = this.props;
    let { value } = this.props;
    if (isNaN(value)) {
      value = 0;
    }
    const handleClick = () => {
      update(value + 2);
    };
    return (
      <div onClick={handleClick}>
        {value}
      </div>
    );
  }
}

const VueNumControl = {
  props: ["readonly", "emitter", "ikey", "getData", "putData"],
  template: "<hello :value='value' @update='update' />",
  data() {
    return {
      value: 0,
    };
  },
  methods: {
    update(newVal: number) {
      this.value = newVal;
      if (this.ikey) {
        this.putData(this.ikey, this.value);
      }
      this.emitter.trigger("process");
    }
  },
  mounted() {
    this.value = this.getData(this.ikey);
  },
  components: {
    hello: Hello
  }
};

class NumControl extends Rete.Control {
  private component: any;
  private props: any;
  private vueContext: any;

  constructor(emitter: any, key: string, readonly: boolean | undefined) {
    super(key);
    this.component = VueNumControl;
    this.props = { emitter, ikey: key, readonly };
  }

  public setValue(val: any) {
    this.vueContext.value = val;
  }
}

class NumComponent extends Rete.Component {

    constructor(){
        super("Number");
    }

    public builder(node: Node) {
        const out1 = new Rete.Output("num", "Number", numSocket);
        const builtNode = node.addControl(new NumControl(this.editor, "num", false)).addOutput(out1);

        return new Promise(resolve => resolve(builtNode));
    }

    public worker(node: { data: { num: any; }; }, inputs: any, outputs: { num: any; }) {
        outputs.num = node.data.num;
    }
}

class AddComponent extends Rete.Component {
    constructor(){
        super("Add");
    }

    // tslint:disable-next-line:max-line-length
    public builder(node: Node) {
        const inp1 = new Rete.Input("num1", "Number", numSocket);
        const inp2 = new Rete.Input("num2", "Number2", numSocket);
        const out = new Rete.Output("num", "Number", numSocket);

        inp1.addControl(new NumControl(this.editor, "num1", false));
        inp2.addControl(new NumControl(this.editor, "num2", false));

        const builtNode = node
            .addInput(inp1)
            .addInput(inp2)
            .addControl(new NumControl(this.editor, "preview", true))
            .addOutput(out);
        return new Promise(resolve => resolve(builtNode));
    }

    // tslint:disable-next-line:max-line-length
    public worker(node: { data: { num1: any; num2: any; }; id: any; }, inputs: { num1: any[]; num2: any[]; }, outputs: { num: any; }) {
        const n1 = inputs.num1.length ? inputs.num1[0] : node.data.num1;
        const n2 = inputs.num2.length ? inputs.num2[0] : node.data.num2;
        const sum = n1 + n2;

        this.editor.nodes.find((n: { id: any; }) => n.id === node.id).controls.get("preview").setValue(sum);
        outputs.num = sum;
    }
}​

export default class FlowToolComponent extends BaseComponent<IProps, IState> {

  private toolDiv: HTMLElement | null;

  public render() {
    return (
      <div className="flow-tool" ref={elt => this.toolDiv = elt} />
    );
  }

  public componentDidMount() {
    (async () => {
      const components = [new NumComponent(), new AddComponent()];
      if (!this.toolDiv) return;

      const editor = new Rete.NodeEditor("demo@0.1.0", this.toolDiv);
      editor.use(ConnectionPlugin);
      editor.use(VueRenderPlugin);
      const readyMenu = [10, 12, 14];
      const dontHide = ["click"];
      editor.use(ContextMenuPlugin);
      // editor.use(AreaPlugin);
      // editor.use(CommentPlugin.default);
      // editor.use(HistoryPlugin);

      const engine = new Rete.Engine("demo@0.1.0");

      components.map(c => {
          editor.register(c);
          engine.register(c);
      });

      const n1 = await components[0].createNode({num: 2});
      const n2 = await components[0].createNode({num: 0});
      const add = await components[1].createNode();

      n1.position = [80, 200];
      n2.position = [80, 400];
      add.position = [500, 240];

      editor.addNode(n1);
      editor.addNode(n2);
      editor.addNode(add);

      editor.connect(n1.outputs.get("num")!, add.inputs.get("num1")!);
      editor.connect(n2.outputs.get("num")!, add.inputs.get("num2")!);

      editor.on("process nodecreated noderemoved connectioncreated connectionremoved", async () => {
        await engine.abort();
        await engine.process(editor.toJSON());
      });

      editor.view.resize();
      // AreaPlugin.zoomAt(editor);
      editor.trigger("process");
  })();
  }
}
