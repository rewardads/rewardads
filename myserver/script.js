const serverName = "MyServer";
let playerName = null;

async function getMoney() {
    if(playerName) {
        const lastNavigationTime = sessionStorage.getItem('lastNavigationTime');
        const currentTime = Date.now();
        const cooldownDuration = 5000;

        if (!lastNavigationTime || currentTime - lastNavigationTime >= cooldownDuration) {
            sessionStorage.setItem('lastNavigationTime', currentTime.toString());

            window.location.href = `money.html?player=${playerName}`;
        } else {
            const remainingCooldown = cooldownDuration - (currentTime - lastNavigationTime);
            const remainingSeconds = (remainingCooldown / 1000).toFixed(2);

            await error(`Please wait ${remainingSeconds}s before watching again the ad!`);
        }
    } else {
        await error("You have to specify the player!");
    }
}

async function letBack() {
    window.location.href = `index.html?player=${playerName}`;
}

async function error(error) {
    document.getElementById("error_text").innerHTML = error;
    document.getElementById('error').style.opacity = '1';

    setTimeout(function() {
        document.getElementById('error').style.opacity = '0';
    }, 3000);
}

async function setCoins(player, coins) {
    let config = await fetchDatabase('coins');
    const code = await getCode();

    if(config.hasOwnProperty(player)) {
        const rewardData = config[player];

        for(const key in rewardData) {
            console.log(key)
            if(rewardData.hasOwnProperty(key)) {
                if(key.includes(code)) {
                    rewardData[key] = coins;
                }
            }
        }

        if(!rewardData.hasOwnProperty(code)) {
            rewardData[code] = coins;
        }
    } else if(!config.hasOwnProperty(player)) {
        const newRewardData = {
            [code]: coins,
        };

        config[player] = newRewardData;
    }

    writeDatabase("coins", writeConfig(config));
}

async function getCoins(player) {
    const result = await fetchDatabase('coins');
    const code = await getCode();
    let coins = null;

    for(const ID in result) {
        if(result.hasOwnProperty(ID)) {
            if(ID.includes(player)) {
                const rewardData = result[ID];

                for(const key in rewardData) {
                    if(rewardData.hasOwnProperty(key)) {
                        if(key.includes(code)) {
                            coins = rewardData[key];
                        }
                    }
                }
            }
        }
    }

    if(coins) {
        return coins;
    } else {
        return 0;
    }
}

async function getCoinsPerAD() {
    const result = await fetchDatabase('servers');
    const code = await getCode() + "";
    let coinsPerAD = null;

    for(const ID in result) {
        if(result.hasOwnProperty(ID)) {
            if(code.includes(ID)) {
                const rewardData = result[ID];

                for(const key in rewardData) {
                    if(rewardData.hasOwnProperty(key)) {
                        if(key.includes("coins-per-ad")) {
                            coinsPerAD = rewardData[key];
                        }
                    }
                }
            }
        }
    }

    return coinsPerAD;
}

async function getCode() {
    const result = await fetchDatabase('servers');
    let code = null;

    for(const ID in result) {
        if(result.hasOwnProperty(ID)) {
            const rewardData = result[ID];

            for(const key in rewardData) {
                if(rewardData.hasOwnProperty(key)) {
                    if(key.includes("name")) {
                        if(rewardData[key].includes(serverName.toLocaleLowerCase())) {
                            code = ID;
                        }
                    }
                }
            }
        }
    }

    return code;
}

async function writeDatabase(databaseName, config) {
    try {
        const url = `https://cors-anywhere.herokuapp.com/http://rewardads.vpsgh.it:1209`;
        const parameters = `${databaseName}=${config}&password=bj,f678nf?>(rd673)`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: parameters
        });

        const statusCode = response.status;
    } catch (error) {
        console.error("Internal Error: I cannot write to our database because it's down!");
    }
}


async function fetchDatabase(databaseName) {
    const url = useProxy(`http://rewardads.vpsgh.it/database/${databaseName}.txt`);
    fetch(`https://proxy.cors.sh/http://rewardads.vpsgh.it/database/${databaseName}.txt`, {
      headers: {
          'x-cors-api-key': 'temp_68cf323e0b51c90c13ad4da46f0e9acf'
      }
    });

    try {
        const response = await fetch(url);
        const data = await response.text();
        
        return parseConfig(data);
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

function writeConfig(config) {
    let result = '';

    for(let [rewardName, rewardData] of Object.entries(config)) {
        result += `${rewardName}:\n`;

        for(let [key, value] of Object.entries(rewardData)) {
            result += `  ${key}: ${value}\n`;
        }

        result += '\n';
    }

    return result;
}

function parseConfig(config) {
    const result = {};
    const lines = config.split('\n');

    let currentReward = null;
    let currentRewardData = null;

    for(const line of lines) {
        if (line.trim().length === 0) {
            continue;
        }

        if(line.match(/\w+:$/)) {
            if(currentReward !== null) {
                result[currentReward] = currentRewardData;
            }

            currentReward = line.slice(0, -1);
            currentRewardData = {};
        } else {
            const parts = line.trim().split(': ');
            
            if(parts.length === 2) {
                currentRewardData[parts[0]] = parts[1];
            }
        }
    }

    if(currentReward !== null) {
        result[currentReward] = currentRewardData;
    }

    return result;
}

document.addEventListener("DOMContentLoaded", async function() {
    var pathname = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);

    urlParams.forEach((value, key) => {
        if(key.includes("player")) {
            playerName = value;
        }
    });

    if(pathname.includes('/money')) {
        const coinsPerAD = await getCoinsPerAD();
        const coloredText = `<span style="color: whitesmoke;">You've received </span><span style="color: orange;">+${coinsPerAD} coins</span><span style="color: whitesmoke;">!</span>`;

        document.getElementById("received").innerHTML = coloredText;
        await setCoins(playerName, parseInt(await getCoins(playerName)) + parseInt(coinsPerAD));
    } else {
        getCoins(playerName).then(result => {
            document.getElementById("coins").innerHTML = result;
        }).catch(error => {
            console.error('Error:', error);
        });

        document.getElementById("servername").innerHTML = serverName;
        document.getElementById("title").innerHTML = serverName + " | RewardADs";
        document.getElementById("coins").innerHTML = await getCoins(playerName);
    }
});

function useProxy(url) {
    const urlFixed = 'https://cors-anywhere.herokuapp.com/' + url;

    return urlFixed;
}
