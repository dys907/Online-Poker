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
        description: 'This powerup allows you to see a card in the river'
    },
    showPlayerCard:
    {
        name: 'showPlayerCard',
        hasTarget: true,
        description: 'This powerup allows you to choose a player and see a card they have'
    },
    swapWithPlayer:
    {
        name: 'swapWithPlayer',
        hasTarget: true,
        description: 'This powerup allows you to choose a player and swap cards with them'
    },
    swapChipsWithPlayer:
    {
        name: 'swapChipsWithPlayer',
        hasTarget: true,
        description: 'Swaps your chip stack with another targetted player'
    }
};

module.exports = PowerUp;