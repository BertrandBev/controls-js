<template lang="pug">
  div(style='width: 100%; height: 100%;'
      ref='div')
</template>

<script>
import Plotly from "plotly.js-dist";
import _ from "lodash";
import eig from '@eigen'

export default {
  name: "RRTPlot",

  props: {
    rrt: Object // [ trajs ]
  },

  data: () => ({
    series: []
  }),

  computed: {
    names() {
      // return this.valueIterationPlanner.system.states.map(st => st.name);
      return ["x axis", "y axis"]
    }
  },

  watch: {},

  mounted() {
    const config = {
      displaylogo: false,
      displayModeBar: false,
      scrollZoom: false,
      showAxisDragHandles: false,
      responsive: true
    };
    Plotly.newPlot(this.$refs.div, [], [], config);

    //
    this.$refs.div.addEventListener('click', ev => {
      // console.log('click event', ev)
      let x = ev.clientX;
      let y = ev.clientY;
      // Normalize
      const xi = (x - 88) / (865 - 88);
      const xj = (y - 679) / (1151 - 679);
      const i = (xi * 2 - 1) * 3;
      const j = -(xj * 2 - 1) * 3;
      // console.log('i', i, 'j', j);
      this.rrt.extend(new eig.Matrix([i, j]));
      this.update();
    })

    // Add watchers
    this.rrt.addWatcher(this.update);
    this.update();
  },

  beforeDestroy() {
    this.rrt.removeWatcher(this.update);
  },

  methods: {
    createLine(x1, x2) {
      return {
        type: 'line',
        opacity: 0.7,
        line: { color: 'red', width: 2.5 },
        x0: x1.get(0),
        y0: x1.get(1),
        x1: x2.get(0),
        y1: x2.get(1),
      };
    },

    appendLinesRec(lines, node) {
      if (!node) return;
      node.next.forEach(subNode => {
        // Handle wrapping
        const x1 = node.x;
        const x2 = subNode.x;
        const dx = x2.matSub(x1);
        const x11 = new eig.Matrix(x1);
        const x22 = new eig.Matrix(x2);
        let split = false;
        for (let k = 0; k < 2; k++) {
          if (!this.rrt.params.wrap[k]) continue;
          const rng = this.rrt.params.xMax[k] - this.rrt.params.xMin[k];
          const adx = Math.abs(dx.get(k));
          if (adx > rng / 2) {
            x11.set(k, x11.get(k) + Math.sign(dx.get(k)) * rng);
            x22.set(k, x22.get(k) - Math.sign(dx.get(k)) * rng);
            split = true;
          }
        }
        // Draw lines
        if (split) {
          lines.push(this.createLine(x1, x22));
          lines.push(this.createLine(x2, x11));
        } else {
          lines.push(this.createLine(x1, x2));
        }
        this.appendLinesRec(lines, subNode);
      })
    },

    update() {
      const lines = []
      this.appendLinesRec(lines, this.rrt.nodes[0])
      const layout = {
        xaxis: { 
          title: this.names[0],
          range: [ this.rrt.params.xMin[0], this.rrt.params.xMax[0] ],
          fixedrange: true
        },
        yaxis: {
          title: this.names[1],
          range: [ this.rrt.params.xMin[1], this.rrt.params.xMax[1] ],
          fixedrange: true
        },
        shapes: lines,
        margin: {
          l: 70,
          r: 100,
          b: 60,
          t: 30,
          pad: 10
        }
      };
      Plotly.react(this.$refs.div, [], layout);
    }
  }
};
</script>