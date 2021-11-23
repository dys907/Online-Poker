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
        hasTarget: false,
        description: 'This powerup allows you to see a card in the river',
        weight:10
    },
    showPlayerCard:
    {
        name: 'showPlayerCard',
        hasTarget: true,
        description: 'This powerup allows you to choose a player and see a card they have',
        weight:5
    },
    swapWithPlayer:
    {
        name: 'swapWithPlayer',
        hasTarget: true,
        description: 'This powerup allows you to choose a player and swap cards with them',
        weight:2
    },
    swapChipsWithPlayer:
    {
        name: 'swapChipsWithPlayer',
        hasTarget: true,
        description: 'Swaps your chip stack with another targetted player',
        weight:1
    },
    redealOwnHand:
    {
        name: 'redealOwnHand',
        hasTarget: false,
        description: 'Deals a new hand for yourself',
        weight:6
    }
};

module.exports = PowerUp;