import SecondOrder from "@/components/models/secondOrder/secondOrder.js";
import SimplePendulum from "@/components/models/simplePendulum.js";
import DoublePendulum from "@/components/models/doublePendulum/doublePendulum.js";
import Arm from "@/components/models/arm/arm.js";

const systems = {
  [SecondOrder.TAG]: SecondOrder,
  [SimplePendulum.TAG]: SimplePendulum,
  [DoublePendulum.TAG]: DoublePendulum,
  [Arm.TAG]: Arm,
};

export default systems