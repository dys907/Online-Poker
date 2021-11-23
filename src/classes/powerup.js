// hello 123
/**
 * Just to keep track of what the power ups are called for now
 * ShowCommunityCard
 * ShowPlayerCard
 * SwapWithPlayer
 * SwapChipsWithPlayer
 */

const PowerUp = {
    showCommunityCard:
    {
        name: 'showCommunityCard',
        logName: 'Peek at community card',
        hasTarget: false,
        description: 'This powerup allows you to see a card in the river',
        weight:10
    },
    showPlayerCard:
    {
        name: 'showPlayerCard',
        logName: "Peek at another player's card",
        hasTarget: true,
        description: 'This powerup allows you to choose a player and see a card they have',
        weight:5
    },
    swapWithPlayer:
    {
        name: 'swapWithPlayer',
        logName: 'Swap cards with another player',
        hasTarget: true,
        description: 'This powerup allows you to choose a player and swap cards with them',
        weight:2
    },
    swapChipsWithPlayer:
    {
        name: 'swapChipsWithPlayer',
        logName: 'Swap chip stack with another player',
        hasTarget: true,
        description: 'Swaps your chip stack with another targetted player',
        weight:1
    },
    redealOwnHand:
    {
        name: 'redealOwnHand',
        logName: 'Redeal a new hand',
        hasTarget: false,
        description: 'Deals a new hand for yourself',
        weight:6
    },
    nozdormu:
    {
        name: 'nozdormu',
        logName: "Nozdormu - Limit a player's turn to 15 seconds",
        hasTarget: true,
        description: 'Force a player to make a move within 15 seconds, or force this player to fold. Hearthstone reference.',
        weight:4
    }
};

module.exports = PowerUp;