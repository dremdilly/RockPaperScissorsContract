// Подключаемся к контракту
const contractAddress = "0x3478295903FD59d9333A7779cD796FbC7b234C0D"; //Замените вашим контрактом

// Указываем ABI (Application Binary Interface) контракта
const abi = [
	{
		inputs: [],
		stateMutability: "nonpayable",
		type: "constructor"
	},
	{
		anonymous: false,
		inputs: [
			{
				indexed: true,
			    internalType: "address",
				name: "player",
				type: "address"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "gameId",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "betAmount",
				type: "uint256"
			},
			{
				indexed: false,
				internalType: "uint256",
				name: "payout",
				type: "uint256"
			}
		],
		name: "GameResult",
		type: "event"
	},
	{
		inputs: [
			{
				internalType: "enum RockPaperScissors.Move",
				name: "playerMove",
				type: "uint8"
			}
		],
		name: "play",
		outputs: [],
		stateMutability: "payable",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "amount",
				type: "uint256"
			}
		],
		name: "withdrawBalance",
		outputs: [],
		stateMutability: "nonpayable",
		type: "function"
	},
	{
		inputs: [],
		name: "gameIdCounter",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		name: "games",
		outputs: [
			{
				internalType: "address",
				name: "player",
				type: "address"
			},
			{
				internalType: "uint256",
				name: "betAmount",
				type: "uint256"
			},
			{
				internalType: "enum RockPaperScissors.Move",
				name: "playerMove",
				type: "uint8"
			},
			{
				internalType: "enum RockPaperScissors.Move",
				name: "houseMove",
				type: "uint8"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [],
		name: "getContractBalance",
		outputs: [
			{
				internalType: "uint256",
				name: "",
				type: "uint256"
			}
		],
		stateMutability: "view",
		type: "function"
	},
	{
		inputs: [],
		name: "owner",
		outputs: [
			{
				internalType: "address",
				name: "",
				type: "address"
			}
		],
		stateMutability: "view",
		type: "function"
	}
];

// Установка конфигурации Web3Modal
const providerOptions = {
  // MetaMask
  injected: {
    display: {
      name: "MetaMask",
      description: "Connect to your MetaMask Wallet",
    },
    package: null,
  },
  // Другие кошельки можно написать здесь
};

// Установка Web3Modal
const web3Modal = new Web3Modal.default({
  network: "binance-testnet", //
  cacheProvider: true,
  providerOptions,
});

let signer;
let contract; 
// Подключаемся к web3 провайдеру (метамаск)
async function connectWallet() {
	const modalProvider = await web3Modal.connect();
	const provider = new ethers.providers.Web3Provider(modalProvider);
	const accounts = await provider.listAccounts();
	signer = provider.getSigner(accounts[0]);

	contract = new ethers.Contract(contractAddress, abi, signer);
	console.log(contract);
	displayGameHistory();
}

connectWallet();

let userScore = 0;
let computerScore = 0;

const userScore_span = document.getElementById('user-score');
const computerScore_span = document.getElementById('computer-score');
const result_p = document.querySelector('.result > p');
const rock_div = document.getElementById('r');
const paper_div = document.getElementById('p');
const scissors_div = document.getElementById('s');

function convertToWord(letter){
    if(letter === 'r') return 'Rock';
    if(letter === 'p') return 'Paper';
    return 'Scissors';
}

function win(userChoice, computerChoice) {
    userScore++;
    userScore_span.innerHTML = userScore;
    computerScore_span.innerHTML = computerScore;
    result_p.innerHTML = `${convertToWord(userChoice)} beats ${convertToWord(computerChoice)}. You win!`;
}

function lose(userChoice, computerChoice) {
    computerScore++;
    userScore_span.innerHTML = userScore;
    computerScore_span.innerHTML = computerScore;
    result_p.innerHTML = `${convertToWord(userChoice)} loses to ${convertToWord(computerChoice)}. You lost...`;
}

function draw(userChoice, computerChoice) {
    result_p.innerHTML = `${convertToWord(userChoice)} equals to ${convertToWord(computerChoice)}. It's a draw`;
}

const MIN_BET_WEI = ethers.utils.parseUnits("0.0001", "ether"); // 0.0001 tBNB in wei

async function game(userChoice) {
    let play;
	
    const overrides = {
      value: MIN_BET_WEI,
    };
  
    // Event listener функция
    const gameResultListener = (player, gameId, betAmount, payout, event) => {
	  console.log("GameResult event received:", player, gameId, betAmount, payout, event);
      if (player === signer._address) {
        updateGameResult(gameId.toNumber());
      }
    };
  
    // Event listener запуск
    contract.on("GameResult", gameResultListener);
  
    switch (userChoice) {
      case "r":
        play = contract.play(0, overrides);
        break;
      case "p":
        play = contract.play(1, overrides);
        break;
      case "s":
        play = contract.play(2, overrides);
        break;
    }
  
    try {
      const tx = await play;
      result_p.innerHTML = `Loading...`;
      const receipt = await tx.wait();
      if (receipt.status === 0) {
        // The transaction failed
        console.error("Transaction failed");
        result_p.innerHTML = `Transaction failed`;
      }
    } catch (error) {
      console.error("Error during transaction execution:", error);
      result_p.innerHTML = `Transaction failed`;
    } finally {
	  contract.off("GameResult", gameResultListener);
	}
}

async function updateGameResult(gameId) {
	console.log("Updating game result for gameId:", gameId);
    const game = await contract.games(gameId);
    const playerMove = game.playerMove;
    const houseMove = game.houseMove;
  
    console.log("playerMove:", playerMove);
    console.log("houseMove:", houseMove);
  
    const userChoice = ["r", "p", "s"][playerMove];
    const computerChoice = ["r", "p", "s"][houseMove];

    console.log("userChoice:", userChoice);
    console.log("computerChoice:", computerChoice);
  
    switch (userChoice + computerChoice) {
      case "pr":
      case "rs":
      case "sp":
        win(userChoice, computerChoice);
        break;
  
      case "rp":
      case "ps":
      case "sr":
        lose(userChoice, computerChoice);
        break;
  
      case "rr":
      case "pp":
      case "ss":
        draw(userChoice, computerChoice);
        break;
    }

	addGameToHistory(gameId, userChoice, computerChoice);
}


// Показать историю игр
async function displayGameHistory() {
    const gameIdCounter = await contract.gameIdCounter();
    const gameHistoryList = document.getElementById("game-history-list");

    for (let i = 1; i <= gameIdCounter; i++) {
        const game = await contract.games(i);
        const playerMove = convertToWord(["r", "p", "s"][game.playerMove]);
        const houseMove = convertToWord(["r", "p", "s"][game.houseMove]);
        const result = getResult(playerMove, houseMove);

        const listItem = document.createElement("li");
        listItem.innerText = `Game ${i}: Player (${playerMove}) vs House (${houseMove}) - ${result}`;
        gameHistoryList.appendChild(listItem);
    }
}
  
function getResult(playerMove, houseMove) {
    const moveCombination = playerMove.toLowerCase().charAt(0) + houseMove.toLowerCase().charAt(0);

    switch (moveCombination) {
        case "pr":
        case "rs":
        case "sp":
            return "Player wins!";
        case "rp":
        case "ps":
        case "sr":
             return "House wins!";
        case "rr":
        case "pp":
        case "ss":
             return "Draw!";
    }
}

function addGameToHistory(gameId, playerMove, houseMove) {
	const gameHistoryList = document.getElementById("game-history-list");
	const result = getResult(playerMove, houseMove);
  
	const listItem = document.createElement("li");
	listItem.innerText = `Game ${gameId}: Player (${playerMove}) vs House (${houseMove}) - ${result}`;
	gameHistoryList.appendChild(listItem);
}

function main(){

    rock_div.addEventListener('click', function(){
        game('r');
    })

    paper_div.addEventListener('click', function(){
        game('p');
    })

    scissors_div.addEventListener('click', function(){
        game('s');
    })
}

main();