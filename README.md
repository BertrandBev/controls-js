[![Website shields.io](https://img.shields.io/website-up-down-green-red/http/shields.io.svg)](https://bertrandbev.github.io/controls-js/#/)
[![GitHub license](https://img.shields.io/github/license/Naereen/StrapDown.js.svg)](https://github.com/Naereen/StrapDown.js/blob/master/LICENSE)

<p align="center">
  <img width="340" src="/src/assets/logo.png">
</p>

# Controls.js

Controls.js is a sandbox showcasing a few modern controls techiques directly in the browser.

It harnesses [eigen-js](https://github.com/BertrandBev/eigen-js) for all linear algebra and quadratic programming, and [nlopt-js](https://github.com/BertrandBev/nlopt-js) for non-linear optimization.

[Home](https://bertrandbev.github.io/controls-js/#/)

## Environments

![alt text](https://api.iconify.design/mdi-matrix.svg?color=purple&width=25&height=25) &nbsp;   [Linear quadratic regulation]()

> This environment demonstrates [linear quadratic regulation](https://en.wikipedia.org/wiki/Linear%E2%80%93quadratic_regulator) of a few test systems around unstable trim points

![alt text](https://api.iconify.design/mdi-restore.svg?color=purple&width=25&height=25) &nbsp;   [Value iteration]()

> A simple pendulum dynamics phase plane is discretized and [the value iteration](https://en.wikipedia.org/wiki/Markov_decision_process#Value_iteration) algorithm is run to obtain a swingup policy

![alt text](https://api.iconify.design/mdi-infinity.svg?color=purple&width=25&height=25) &nbsp;   [Differential flatness]()

> A [differentially flat](https://en.wikipedia.org/wiki/Flatness_(systems_theory)) system, a 2D quadcopter, follows a custom spatial trajectory

![alt text](https://api.iconify.design/mdi-vector-curve.svg?color=purple&width=25&height=25) &nbsp;   [Direct collocation]()

> Nonlinear trajectory optimisation is demonstrated on a few dynamical systems using [direct collocation](https://en.wikipedia.org/wiki/Trajectory_optimization)

![alt text](https://api.iconify.design/mdi-camera-timer.svg?color=purple&width=25&height=25) &nbsp;   [Model predictive control]()

> [Model predictive control](https://en.wikipedia.org/wiki/Model_predictive_control) is used to dynamically stabilize the systems in the previous section around their optimized trajectories for robust tracking.

![alt text](https://api.iconify.design/mdi-chart-bell-curve.svg?color=purple&width=25&height=25) &nbsp;   [Kalman Filter]()

> A [kalman filter](https://en.wikipedia.org/wiki/Kalman_filter) estimator tracks a 2d top down car's state based on radar measurements

![alt text](https://api.iconify.design/mdi-dots-hexagon.svg?color=purple&width=25&height=25) &nbsp;   [Particle Filter]()

> A [particle filter](https://en.wikipedia.org/wiki/Particle_filter) estimator tracks a 2d top down car's state based on radar measurements using a swarm of simulated particles
