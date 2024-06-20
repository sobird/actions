const a = 0;
const foo = 2;
switch (foo) {
  // The following case clauses are wrapped into blocks using brackets
  case 1: {
    const x = 1;
    break;
  }
  case 2: {
    const y = 2;
    break;
  }
  case 3: {
    function f() {}
    break;
  }
  case 4:
    // Declarations using var without brackets are valid due to function-scope hoisting
    var z = 4;
    break;
  default: {
    class C {}
  }
}
