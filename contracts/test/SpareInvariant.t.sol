// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test} from "forge-std/Test.sol";
import {Spare} from "../src/Spare.sol";

contract SpareHandler is Test {
  Spare public spare;

  address public payer = address(0xAA11);
  address public merchant = address(0xBB22);
  address public cause1 = address(0xCC33);
  address public cause2 = address(0xDD44);

  constructor(Spare _spare) {
    spare = _spare;
    vm.deal(payer, 10_000_000 ether);
    vm.deal(merchant, 1000 ether);
    vm.deal(cause1, 1000 ether);
    vm.deal(cause2, 1000 ether);
  }

  function pay(uint128 price, uint128 unit, uint8 causeChoice) external {
    price = uint128(bound(price, 0.001 ether, 10_000 ether));
    unit = uint128(bound(unit, 0.001 ether, 500 ether));
    address selectedCause = (causeChoice % 2 == 0) ? cause1 : cause2;

    (, uint256 total) = spare.quote(price, unit);

    vm.prank(payer);
    try spare.pay{value: total}(merchant, selectedCause, price, unit, "Handler Pay") {} catch {}
  }

  function withdraw(uint8 who) external {
    address target = who % 3 == 0 ? merchant : (who % 3 == 1 ? cause1 : cause2);
    vm.prank(target);
    try spare.withdraw() {} catch {}
  }
}

contract SpareInvariantTest is Test {
  Spare public spare;
  SpareHandler public handler;

  function setUp() public {
    vm.warp(1_760_000_000);
    spare = new Spare();
    handler = new SpareHandler(spare);
    targetContract(address(handler));
  }

  function invariant_BalanceEqualsPending() public view {
    uint256 balance = address(spare).balance;
    uint256 pendingTotal = spare.pending(handler.merchant()) + spare.pending(handler.cause1())
      + spare.pending(handler.cause2());

    assertEq(balance, pendingTotal, "Invariant broken: balance != sum(pending)");
  }
}
