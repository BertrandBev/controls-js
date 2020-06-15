import SecondOrder from "@/components/models/secondOrder/secondOrder.js";
import SimplePendulum from "@/components/models/simplePendulum.js";
import DoublePendulum from "@/components/models/doublePendulum/doublePendulum.js";

const systems = {
  [SecondOrder.TAG]: SecondOrder,
  [SimplePendulum.TAG]: SimplePendulum,
  [DoublePendulum.TAG]: DoublePendulum,
};

export default systems