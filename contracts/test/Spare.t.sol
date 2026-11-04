// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {Test, console2} from "forge-std/Test.sol";
import {Spare} from "../src/Spare.sol";

contract SpareTest is Test {
  Spare public spare;

  address public payer = address(0xAAAA);
  address public merchant = address(0xBBBB);
  address public cause = address(0xCCCC);
  address public stranger = address(0xDDDD);

  event Paid(
    uint256 indexed id,
    address indexed payer,
    address indexed merchant,
    address cause,
    uint128 price,
    uint128 spare,
    uint128 unit,
    string memo
  );
  event Registered(address indexed who, string name);
  event Withdrawn(address indexed to, uint256 amount);

  function setUp() public {
    vm.warp(1_760_000_000);
    spare = new Spare();
    vm.deal(payer, 1000 ether);
    vm.deal(merchant, 100 ether);
    vm.deal(cause, 100 ether);
    vm.deal(stranger, 100 ether);
  }

  function test_PayRoundsUpToUnit() public {
    uint128 price = 2.4 ether;
    uint128 unit = 1 ether;
    // Next multiple is 3 ether; change is 0.6 ether
    uint128 change = spare.spare(price, unit);
    assertEq(change, 0.6 ether);

    uint256 expectedTotal = 3 ether;

    vm.expectEmit(true, true, true, true);
    emit Paid(1, payer, merchant, cause, price, change, unit, "Coffee & Beans");

    vm.prank(payer);
    uint256 id = spare.pay{value: expectedTotal}(merchant, cause, price, unit, "Coffee & Beans");

    assertEq(id, 1);
    assertEq(spare.pending(merchant), price);
    assertEq(spare.pending(cause), change);
    assertEq(spare.given(payer), change);
    assertEq(spare.received(cause), change);
  }

  function test_ExactMultipleHasNoSpare() public {
    uint128 price = 5 ether;
    uint128 unit = 1 ether;
    uint128 change = spare.spare(price, unit);
    assertEq(change, 0);

    vm.prank(payer);
    spare.pay{value: price}(merchant, cause, price, unit, "Exact Multiple");

    assertEq(spare.pending(merchant), price);
    assertEq(spare.pending(cause), 0);
    assertEq(spare.given(payer), 0);
    assertEq(spare.received(cause), 0);
  }

  function test_SpareIsLessThanUnit() public view {
    uint128 change = spare.spare(1.0001 ether, 1 ether);
    assertTrue(change < 1 ether);
    assertEq(change, 0.9999 ether);
  }

  function test_MerchantGetsExactPrice() public {
    uint128 price = 4.75 ether;
    uint128 unit = 0.5 ether; // rounds to 5.0 ether; change 0.25 ether

    vm.prank(payer);
    spare.pay{value: 5 ether}(merchant, cause, price, unit, "Memo");

    assertEq(spare.pending(merchant), price);
  }

  function test_CauseGetsTheChange() public {
    uint128 price = 10.3 ether;
    uint128 unit = 1 ether; // rounds to 11.0 ether; change 0.7 ether

    vm.prank(payer);
    spare.pay{value: 11 ether}(merchant, cause, price, unit, "Memo");

    assertEq(spare.pending(cause), 0.7 ether);
  }

  function test_GivenAndReceivedTotalsMatch() public {
    uint128 unit = 1 ether;

    vm.prank(payer);
    spare.pay{value: 2 ether}(merchant, cause, 1.2 ether, unit, "P1"); // 0.8 ether change

    vm.prank(payer);
    spare.pay{value: 3 ether}(merchant, cause, 2.5 ether, unit, "P2"); // 0.5 ether change

    assertEq(spare.given(payer), 1.3 ether);
    assertEq(spare.received(cause), 1.3 ether);
  }

  function test_WrongPaymentReverts_ArgsExpected() public {
    uint128 price = 1.4 ether;
    uint128 unit = 1 ether;
    // Expected total: 2 ether
    vm.expectRevert(abi.encodeWithSelector(Spare.WrongPayment.selector, 2 ether));
    vm.prank(payer);
    spare.pay{value: 1.4 ether}(merchant, cause, price, unit, "Wrong");
  }

  function test_BadMerchantCauseUnitPriceRevert() public {
    // Bad merchant 0
    vm.expectRevert(Spare.BadMerchant.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(address(0), cause, 0.5 ether, 1 ether, "M");

    // Bad merchant address(this)
    vm.expectRevert(Spare.BadMerchant.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(address(spare), cause, 0.5 ether, 1 ether, "M");

    // Bad cause 0
    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, address(0), 0.5 ether, 1 ether, "M");

    // Bad cause == merchant
    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, merchant, 0.5 ether, 1 ether, "M");

    // Bad cause == payer
    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, payer, 0.5 ether, 1 ether, "M");

    // Bad cause == address(this)
    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, address(spare), 0.5 ether, 1 ether, "M");

    // Bad price 0
    vm.expectRevert(Spare.BadPrice.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, cause, 0, 1 ether, "M");

    // Bad price > MAX_PRICE
    vm.expectRevert(Spare.BadPrice.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, cause, 1_000_001 ether, 1 ether, "M");

    // Bad unit < MIN_UNIT (0.001 ether)
    vm.expectRevert(Spare.BadUnit.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, cause, 0.5 ether, 0.0009 ether, "M");

    // Bad unit > MAX_UNIT (1000 ether)
    vm.expectRevert(Spare.BadUnit.selector);
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, cause, 0.5 ether, 1001 ether, "M");
  }

  function test_CauseCannotBeMerchantOrPayer() public {
    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 2 ether}(merchant, merchant, 1.5 ether, 1 ether, "");

    vm.expectRevert(Spare.BadCause.selector);
    vm.prank(payer);
    spare.pay{value: 2 ether}(merchant, payer, 1.5 ether, 1 ether, "");
  }

  function test_MemoTooLongReverts() public {
    string memory longMemo = new string(65);
    vm.expectRevert(Spare.MemoTooLong.selector);
    vm.prank(payer);
    spare.pay{value: 2 ether}(merchant, cause, 1.5 ether, 1 ether, longMemo);
  }

  function test_RegisterAndRename() public {
    // Bad name empty
    vm.expectRevert(Spare.BadName.selector);
    vm.prank(cause);
    spare.register("");

    // Bad name > 40 bytes
    string memory longName = new string(41);
    vm.expectRevert(Spare.BadName.selector);
    vm.prank(cause);
    spare.register(longName);

    // Initial register
    vm.expectEmit(true, false, false, true);
    emit Registered(cause, "Local Food Bank");
    vm.prank(cause);
    spare.register("Local Food Bank");

    assertEq(spare.causeCount(), 1);
    Spare.Cause memory c = spare.causeOf(cause);
    assertEq(c.name, "Local Food Bank");
    assertTrue(c.registeredBlock > 0);

    // Rename
    vm.prank(cause);
    spare.register("Community Pantry");
    assertEq(spare.causeCount(), 1); // same count
    assertEq(spare.causeOf(cause).name, "Community Pantry");
  }

  function test_CauseListPagination() public {
    for (uint160 i = 1; i <= 5; i++) {
      address cAddr = address(uint160(0x9000 + i));
      vm.prank(cAddr);
      spare.register("Cause Name");
    }

    assertEq(spare.causeCount(), 5);

    (address[] memory addrs, Spare.Cause[] memory details, uint256 total) = spare.causes(0, 3);
    assertEq(total, 5);
    assertEq(addrs.length, 3);
    assertEq(details.length, 3);
    assertEq(addrs[0], address(0x9001));
    assertEq(addrs[1], address(0x9002));
    assertEq(addrs[2], address(0x9003));

    // Clamp count
    (address[] memory clampedAddrs,,) = spare.causes(3, 10);
    assertEq(clampedAddrs.length, 2);
  }

  function test_ReentrantWithdrawBlocked() public {
    ReentrantAttacker attacker = new ReentrantAttacker(spare);
    vm.deal(address(attacker), 10 ether);

    // Payer pays attacker as merchant
    vm.prank(payer);
    spare.pay{value: 2 ether}(address(attacker), cause, 1.5 ether, 1 ether, "Test");

    assertEq(spare.pending(address(attacker)), 1.5 ether);

    vm.expectRevert(Spare.TransferFailed.selector);
    attacker.attack();
  }

  // --- Fuzz Tests ---

  function testFuzz_RoundUpIsExact(uint128 price, uint128 unit) public view {
    vm.assume(price > 0 && price <= 1_000_000 ether);
    vm.assume(unit >= 0.001 ether && unit <= 1000 ether);

    uint128 change = spare.spare(price, unit);
    assertTrue(change < unit);

    uint256 total = uint256(price) + uint256(change);
    assertEq(total % uint256(unit), 0);
  }

  function testFuzz_Conservation(uint128 price, uint128 unit) public {
    vm.assume(price > 0 && price <= 10_000 ether);
    vm.assume(unit >= 0.001 ether && unit <= 500 ether);

    (uint128 change, uint256 total) = spare.quote(price, unit);

    vm.deal(payer, total + 1 ether);

    uint256 contractBalBefore = address(spare).balance;

    vm.prank(payer);
    spare.pay{value: total}(merchant, cause, price, unit, "Fuzz Payment");

    assertEq(address(spare).balance, contractBalBefore + total);
    assertEq(spare.pending(merchant), price);
    assertEq(spare.pending(cause), change);
    assertEq(uint256(price) + uint256(change), total);

    // Withdraw both
    vm.prank(merchant);
    spare.withdraw();

    if (change > 0) {
      vm.prank(cause);
      spare.withdraw();
    }

    assertEq(address(spare).balance, contractBalBefore);
  }

  function test_BoundaryMutantKillers() public {
    // Exact MIN_UNIT (0.001 ether)
    vm.prank(payer);
    spare.pay{value: 0.002 ether}(merchant, cause, 0.0015 ether, 0.001 ether, "Min Unit");

    // Exact MAX_UNIT (1000 ether)
    vm.deal(payer, 2_000_000 ether);
    vm.prank(payer);
    spare.pay{value: 1000 ether}(merchant, cause, 500 ether, 1000 ether, "Max Unit");

    // Exact MAX_PRICE (1_000_000 ether)
    vm.deal(payer, 2_000_000 ether);
    vm.prank(payer);
    spare.pay{value: 1_000_000 ether}(merchant, cause, 1_000_000 ether, 1000 ether, "Max Price");

    // Exact 64-byte memo
    string memory exact64 = "1234567890123456789012345678901234567890123456789012345678901234";
    vm.prank(payer);
    spare.pay{value: 1 ether}(merchant, cause, 0.5 ether, 1 ether, exact64);

    // Exact 40-byte cause name
    string memory exact40 = "1234567890123456789012345678901234567890";
    vm.prank(cause);
    spare.register(exact40);
  }
}

contract ReentrantAttacker {
  Spare public spare;
  bool public attacking;

  constructor(Spare _spare) {
    spare = _spare;
  }

  function attack() external {
    attacking = true;
    spare.withdraw();
  }

  receive() external payable {
    if (attacking) {
      spare.withdraw();
    }
  }
}
