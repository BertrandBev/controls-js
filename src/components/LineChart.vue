<script>
import { Line, mixins } from "vue-chartjs";
const { reactiveProp, reactiveData } = mixins;

export default {
  extends: Line,

  mixins: [reactiveData],

  created() {
    this.chartData = {
      labels: [1, 2],
      datasets: [
        {
          label: "Data One",
          // backgroundColor: "#f87979",
          data: [1, 2]
        },
        {
          label: "Data Two",
          // backgroundColor: "#f87979",
          data: [1, 2]
        }
      ]
    };
  },

  mounted() {
    // this.chartData is created in the mixin
    this.renderChart(this.chartData, {});
  }
};
</script>
