import * as React from "react";
import { observer, inject } from "mobx-react";
import { BaseComponent } from "../../base";
import { ToolTileModelType } from "../../../models/tools/tool-tile";
import { GraphContentModelType } from "../../../models/tools/graph/graph-content";
import { ChartOptions, ChartType } from "chart.js";
import { Scatter, ChartData, Line } from "react-chartjs-2";

import "./graph-tool.sass";

interface IProps {
  model: ToolTileModelType;
  readOnly: boolean;
  scale?: number;
}

interface IState {
  times: string[];
  values: number[];
}

const defaultOptions: ChartOptions = {
  animation: {
    duration: 0
  },
  title: {
    display: true,
    text: "Data",
    fontSize: 22
  },
  legend: {
    display: true,
    position: "bottom",
  },
  maintainAspectRatio: false,
  scales: {
    display: false,
    yAxes: [{
      id: "y-axis-0",
      ticks: {
        min: 0,
        max: 100
      },
      scaleLabel: {
        display: true,
        fontSize: 12
      }
    }],
    xAxes: [{
      id: "x-axis-0",
      display: true,
      ticks: {
        min: 0,
        max: 20
      }
    }]
  },
  elements: { point: { radius: 0 } },
  showLines: true
};

@inject("stores")
@observer
export default class GraphToolComponent extends BaseComponent<IProps, IState> {
  private timerId: any;
  private time = 0.0;
  constructor(props: IProps) {
    super(props);

    this.state = {
      times: [],
      values: []
    };
  }

  public render() {
    const { model, readOnly } = this.props;
    const { times, values } = this.state;
    const editableClass = readOnly ? "read-only" : "editable";
    const classes = `graph-tool ${editableClass}`;
    const w = 800;
    const h = 400;
    const options: ChartOptions = {
      animation: {
        duration: 0
      },
      title: {
        display: true,
        text: "Fake Sensor Data",
        fontSize: 14
      },
      scales: {
        yAxes: [{
          ticks: {
            maxTicksLimit: 5,
          },
          scaleLabel: {
            display: true,
            labelString: "fake value"
          }
        }],
        xAxes: [{
          ticks: {
            maxTicksLimit: 5,
            minRotation: 0,
            maxRotation: 0
          },
          scaleLabel: {
            display: true,
            labelString: "timestamp"
          }
        }]
      },
      maintainAspectRatio: false,
    };

    const chartData = {
      labels : times,
      datasets : [
        {
          fillColor: "rgba(255,255,255,0)",
          strokeColor: "rgba(16,133,135,1)",
          pointColor: "rgba(16,133,135,1)",
          pointStrokeColor: "#fff",
          pointHighlightFill: "#fff",
          pointHighlightStroke: "rgba(16,133,135,1)",
          backgroundColor: "#D7E3C9",
          data : values
        }
      ]
    };

    return (
        <div className={classes}>
          <button onClick={this.handleClickStartSine}>Start Sine Data</button>
          <button onClick={this.handleClickStartRandom}>Start Random Data</button>
          <button onClick={this.handleClickStop}>Stop Data</button>
          <button onClick={this.handleClickClear}>Clear Data</button>
          <div className="graph-container">
            <Line
              data={chartData}
              options={options}
              redraw={true}
            />
          </div>
        </div>
    );
  }

  private readFakeSineData = () => {
    const { times, values } = this.state;
    const fakeValue = Math.sin((Math.PI / 3) * this.time) * 3 + 20;
    this.time += .5;
    times.push(this.getDateTimeString());
    values.push(fakeValue);
    this.setState({ times, values });
  }

  private readFakeRandomData = () => {
    const { times, values } = this.state;
    const fakeValue = Math.random() * 20;
    this.time += .5;
    times.push(this.getDateTimeString());
    values.push(fakeValue);
    this.setState({ times, values });
  }

  private getDateTimeString = () => {
    const date = new Date();
    const dateReadable = date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDay();
    const timeReadable = date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    return (dateReadable + " " + timeReadable);
  }

  private startCollectingSine = () => {
    if (!this.timerId) {
      this.timerId = setInterval(this.readFakeSineData, 500);
    }
  }
  private startCollectingRandom = () => {
    if (!this.timerId) {
      this.timerId = setInterval(this.readFakeRandomData, 500);
    }
  }
  private stopCollecting = () => {
    clearInterval(this.timerId);
    this.timerId = null;
  }

  private clearData = () => {
    let { times, values } = this.state;
    times = [];
    values = [];
    this.setState({ times, values });
  }

  private handleClickStartSine = () => {
    this.startCollectingSine();
  }

  private handleClickStartRandom = () => {
    this.startCollectingRandom();
  }

  private handleClickStop = () => {
    this.stopCollecting();
  }

  private handleClickClear = () => {
    this.clearData();
  }
}
