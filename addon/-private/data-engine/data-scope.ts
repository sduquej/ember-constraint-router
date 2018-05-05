import { DataNode } from "ember-constraint-router/-private/data-engine/data-node";
import { run } from '@ember/runloop';
import { guidFor } from '../utils';

export class DataScope {
  registry: { [k: string]: DataNode | null };
  dataNodes: DataNode[];
  newData: [string, DataNode, any][];

  constructor(base?: DataScope) {
    this.registry = {};
    this.dataNodes = [];
    this.newData = [];
    if (base) {
      Object.keys(base.registry).forEach(k => {
        this.register(k, base.registry[k]!);
      });
    }
  }

  _notifyNewData(dataNode: DataNode, dataName: string, value: any) {
    this.newData.push([dataName, dataNode, value]);
    console.log(`FrameScope ${guidFor(this)} got ${dataName} from ${dataNode.name}`);
    run.scheduleOnce('actions', this, this._flushNewData);
  }

  _flushNewData() {
    let newData = this.newData;
    this.newData = [];

    let dependentNodes: { [k: string]: DataNode[] } = {};
    this.dataNodes.forEach(dataNode => {
      dataNode.dependencies.forEach(d => {
        // TODO: reexamine whether we need to prevent double registers.
        // TODO: .own()
        if (!dependentNodes[d]) {
          dependentNodes[d] = [];
        }
        dependentNodes[d].push(dataNode);
      })
    });

    let nodesWithNewDependentData: { [k: string]: DataNode } = {};

    newData.forEach(([dataName, dataNode, value]) => {
      let nodes = dependentNodes[dataName];
      if (!nodes) { return; }
      nodes.forEach(dependentNode => {
        nodesWithNewDependentData[dependentNode.name] = dependentNode;
        dependentNode.stashDependencyData(dataNode, value);
      });
    });

    Object.keys(nodesWithNewDependentData).forEach(k => {
      let dataNode = nodesWithNewDependentData[k];
      dataNode.step();
    });
  }

  lookup(name: string, key: string) : DataNode | null {
    let preexistingNode = this.registry[name];
    if (preexistingNode && preexistingNode.key === key) {
      return preexistingNode;
    } else {
      return null;
    }
  }

  register(name: string, dataNode: DataNode) {
    this.registry[name] = dataNode;

    dataNode.listen(this, this._notifyNewData);
    dataNode.own();
    this.dataNodes.push(dataNode);

    if (dataNode.hasProducedValue()) {
      this._notifyNewData(dataNode, name, dataNode.value);
    }
  }

  start() {
    this.dataNodes.forEach(dataNode => {
      dataNode.step();
    });
  }
}
