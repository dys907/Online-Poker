// hello 123
/**
 * Just to keep track of what the power ups are called for now
 * ShowCommunityCard
 * ShowPlayerCard
 * SwapWithPlayer
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
    }
};

module.exports = PowerUp;