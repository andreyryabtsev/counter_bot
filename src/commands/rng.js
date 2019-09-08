module.exports = (message, text) => {
    let max = parseInt(util.args(text)[0]);
    if (isNaN(max) || max <= 0) {
        message.channel.send(config["etc"]["rng_error"]);
        return;
    }
    message.channel.send(1 + Math.floor(Math.random() * max));
}