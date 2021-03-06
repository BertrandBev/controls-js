import SecondOrder from "@/components/models/secondOrder/secondOrder.js";
import SimplePendulum from "@/components/models/simplePendulum/simplePendulum.js";
import DoublePendulum from "@/components/models/doublePendulum/doublePendulum.js";
import Quadrotor2D from "@/components/models/quadrotor2D/quadrotor2D.js";
import CartPole from "@/components/models/cartPole/cartPole.js";
import Arm from "@/components/models/arm/arm.js";
import Car from "@/components/models/car/car.js";


const systems = {
  [SecondOrder.TAG]: SecondOrder,
  [SimplePendulum.TAG]: SimplePendulum,
  [DoublePendulum.TAG]: DoublePendulum,
  [Quadrotor2D.TAG]: Quadrotor2D,
  [CartPole.TAG]: CartPole,
  [Arm.TAG]: Arm,
  [Car.TAG]: Car,
};

export default systems