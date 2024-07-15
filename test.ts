/* eslint-disable max-classes-per-file */
import path from 'path';

abstract class Vehicle {
  abstract run(): void;
}
class SuperX01 extends Vehicle {
  run(): void {
    console.log('SuperX01 start');
  }
}

class SuperX02 extends Vehicle {
  run(): void {
    console.log('SuperX02 start');
  }
}

abstract class VehicleFactory {
  abstract produceVehicle(): Vehicle;
}

class SuperX01Factory extends VehicleFactory {
  produceVehicle(): Vehicle {
    return new SuperX01();
  }
}
class SuperX02Factory extends VehicleFactory {
  produceVehicle(): Vehicle {
    return new SuperX02();
  }
}

const superX01Factory = new SuperX01Factory();
const superX02Factory = new SuperX02Factory();

const superX01Vehicle = superX01Factory.produceVehicle();
const superX02Vehicle = superX02Factory.produceVehicle();

superX01Vehicle.run();
superX02Vehicle.run();

console.log('process', process);
const moduleDirname = path.dirname(new URL(import.meta.url).pathname);
console.log('moduleDirname', moduleDirname);
