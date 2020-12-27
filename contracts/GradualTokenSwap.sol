// SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


// Forked from https://github.com/hegic/GradualTokenSwap/blob/master/contracts/ERC20Recovery.sol
abstract contract ERC20Recovery is Ownable {
    using SafeERC20 for IERC20;
    function recoverERC20(IERC20 token) external onlyOwner {
        token.safeTransfer(owner(), token.balanceOf(address(this)));
    }
}


// Forked from https://github.com/hegic/GradualTokenSwap/blob/master/contracts/GradualTokenSwap.sol
contract GradualTokenSwap is ERC20Recovery {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    event Withdrawn(address account, uint256 amount);

    uint256 public start;
    uint256 public duration;
    IERC20 public rHEGIC;
    IERC20 public HEGIC;

    mapping(address => uint) public released;
    mapping(address => uint) public provided;

    constructor (uint256 _start, uint256 _duration, IERC20 _rHEGIC, IERC20 _HEGIC) {
        if(_start == 0) _start = block.timestamp;
        require(_duration > 0, "GTS: duration is 0");

        duration = _duration;
        start = _start;
        rHEGIC =_rHEGIC;
        HEGIC = _HEGIC;
    }

    function provide(uint amount) external {
      rHEGIC.safeTransferFrom(msg.sender, address(this), amount);
      provided[msg.sender] = provided[msg.sender].add(amount);
    }

    function withdraw() external {
        uint amount = available(msg.sender);
        require(amount > 0, "GTS: You are have not unlocked tokens yet");
        released[msg.sender] = released[msg.sender].add(amount);
        HEGIC.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    function available(address account) public view returns (uint256) {
        return unlocked(account).sub(released[account]);
    }

    function unlocked(address account) public view returns (uint256) {
        if(block.timestamp < start)
            return 0;
        if (block.timestamp >= start.add(duration)) {
            return provided[account];
        } else {
            return provided[account].mul(block.timestamp.sub(start)).div(duration);
        }
    }
}


// The same GradualTokenSwap contract but with functions to modify some state variables,
// so that I don't need to redeploy the contract everytime I run a test.
contract GradualTokenSwapUpgradable is GradualTokenSwap {
    function resetStateVariables(
        uint256 _start,
        uint256 _duration,
        IERC20 _rHEGIC,
        IERC20 _HEGIC
    )
    external onlyOwner {
        duration = _duration;
        start = _start;
        rHEGIC =_rHEGIC;
        HEGIC = _HEGIC;
    }

    function resetUserData(
        address _account,
        uint _provided,
        uint _released
    )
    external onlyOwner {
        provided[_account] = _provided;
        released[_account] = _released;
    }
}
