// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

/**
 * @title Spare
 * @notice Pay a merchant and round up to the next multiple of a unit, directing the change to a cause.
 * @dev Employs pull payment for all balances. No admin or owner.
 *      Change formula: spare(price, unit) = ((price + unit - 1) / unit) * unit - price
 */
contract Spare {
  // --- Constants ---
  uint128 public constant MIN_UNIT = 0.001 ether;
  uint128 public constant MAX_UNIT = 1000 ether;
  uint128 public constant MAX_PRICE = 1_000_000 ether;
  uint256 public constant MAX_MEMO_BYTES = 64;
  uint256 public constant MAX_NAME_BYTES = 40;
  uint256 public constant MAX_PAGE = 50;

  // --- Types ---
  struct Cause {
    string name;
    uint32 registeredBlock;
  }

  // --- Storage ---
  uint256 private _status; // Reentrancy lock
  uint256 public paymentCount;
  mapping(address => Cause) private _causes;
  address[] private _causeList;
  mapping(address => uint256) public given;
  mapping(address => uint256) public received;
  mapping(address => uint256) public pending;

  // --- Events ---
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

  // --- Errors ---
  error BadMerchant();
  error BadCause();
  error BadPrice();
  error BadUnit();
  error BadName();
  error MemoTooLong();
  error WrongPayment(uint256 expected);
  error NothingToWithdraw();
  error TransferFailed();
  error ReentrancyGuard();

  modifier nonReentrant() {
    if (_status == 2) revert ReentrancyGuard();
    _status = 2;
    _;
    _status = 1;
  }

  constructor() {
    _status = 1;
  }

  // --- External State-Changing Functions ---

  /**
   * @notice Pay a merchant, rounding up to the next multiple of unit and giving change to cause.
   * @param merchant Recipient of the price.
   * @param cause Recipient of the change (spare).
   * @param price Amount paid to merchant.
   * @param unit Round-up unit (e.g. 1 ether).
   * @param memo Optional note (<= 64 bytes).
   */
  function pay(address merchant, address cause, uint128 price, uint128 unit, string calldata memo)
    external
    payable
    returns (uint256 id)
  {
    if (merchant == address(0) || merchant == address(this)) revert BadMerchant();
    if (cause == address(0) || cause == merchant || cause == msg.sender || cause == address(this)) {
      revert BadCause();
    }
    if (price == 0 || price > MAX_PRICE) revert BadPrice();
    if (unit < MIN_UNIT || unit > MAX_UNIT) revert BadUnit();
    if (bytes(memo).length > MAX_MEMO_BYTES) revert MemoTooLong();

    uint128 change = spare(price, unit);
    uint256 expected = uint256(price) + uint256(change);
    if (msg.value != expected) revert WrongPayment(expected);

    unchecked {
      id = ++paymentCount;
    }

    pending[merchant] += price;
    if (change > 0) {
      pending[cause] += change;
      given[msg.sender] += change;
      received[cause] += change;
    }

    emit Paid(id, msg.sender, merchant, cause, price, change, unit, memo);
  }

  /**
   * @notice Register or update a human label for caller's cause address.
   * @param name Name string (1..40 bytes).
   */
  function register(string calldata name) external {
    bytes calldata nb = bytes(name);
    if (nb.length == 0 || nb.length > MAX_NAME_BYTES) revert BadName();

    Cause storage c = _causes[msg.sender];
    if (c.registeredBlock == 0) {
      c.registeredBlock = uint32(block.number);
      _causeList.push(msg.sender);
    }
    c.name = name;

    emit Registered(msg.sender, name);
  }

  /**
   * @notice Withdraw accumulated pending balance (pull payment).
   */
  function withdraw() external nonReentrant {
    uint256 amount = pending[msg.sender];
    if (amount == 0) revert NothingToWithdraw();

    pending[msg.sender] = 0;

    (bool ok,) = msg.sender.call{value: amount}("");
    if (!ok) revert TransferFailed();

    emit Withdrawn(msg.sender, amount);
  }

  // --- Views ---

  /**
   * @notice Calculate change needed to round up price to next multiple of unit.
   */
  function spare(uint128 price, uint128 unit) public pure returns (uint128) {
    uint256 rem = uint256(price) % uint256(unit);
    if (rem == 0) return 0;
    return uint128(uint256(unit) - rem);
  }

  /**
   * @notice Quote the spare and total cost for a price and unit.
   */
  function quote(uint128 price, uint128 unit)
    external
    pure
    returns (uint128 change, uint256 total)
  {
    change = spare(price, unit);
    total = uint256(price) + uint256(change);
  }

  function causeOf(address addr) external view returns (Cause memory) {
    return _causes[addr];
  }

  function causeCount() external view returns (uint256) {
    return _causeList.length;
  }

  function causes(uint256 offset, uint256 count)
    external
    view
    returns (address[] memory addrs, Cause[] memory details, uint256 total)
  {
    total = _causeList.length;
    if (offset >= total || count == 0) {
      return (new address[](0), new Cause[](0), total);
    }
    if (count > MAX_PAGE) {
      count = MAX_PAGE;
    }
    if (offset + count > total) {
      count = total - offset;
    }

    addrs = new address[](count);
    details = new Cause[](count);
    for (uint256 i = 0; i < count;) {
      address a = _causeList[offset + i];
      addrs[i] = a;
      details[i] = _causes[a];
      unchecked {
        ++i;
      }
    }
  }
}
