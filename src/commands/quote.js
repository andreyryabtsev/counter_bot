module.exports = (message, text) => {
    if (text) {
        db.filteredQuotes(text, quotes => {
            if (quotes.length > 0) {
                let quote = util.simpleRandom(quotes);
                sendQuote(message.channel, quote.content, quote.nickname);
            } else {
                message.channel.send(config["quotes"]["quote_error"]);
                return;
            }
        });
    } else {
        let n = config["quotes"]["relevancy_params"]["message_count"],
            e = config["quotes"]["relevancy_params"]["exponentiation"],
            p = config["quotes"]["relevancy_params"]["weight"];
        message.channel.fetchMessages({ limit: n * 10, before: message.id}).then(messages => {
            db.allQuotes(quotes => {
                if (quotes.length == 0) {
                    message.channel.send(config["quotes"]["quote_error"]);
                    return;
                }
                let minTime = Math.min(...quotes.map(quote => {
                    return !parseInt(quote.called_at) ? Infinity : parseInt(quote.called_at);
                }));
                let quoteGlossary = buildQuoteGlossary(quotes);
                let recentGlossary = {};
                messages = messages.array();
                let count = 0;
                for (let i = 0; i < n*10; i++) {
                    if (!messages[i].author.bot && !messages[i].content.startsWith("!")) {
                        let words = util.toWords(messages[i].content);
                        if (words.length > 1) {
                            for (let word of words) {
                                if (!(word in recentGlossary)) recentGlossary[word] = 0;
                                recentGlossary[word]++;
                            }
                            if (++count >= n) break;
                        }
                    }
                }
                if (Object.keys(recentGlossary).length == 0) {
                    let quote = util.simpleRandom(quotes);
                    sendQuote(message.channel, quote.content, quote.nickname);
                    return;
                }
                let weightSum = 0.0;
                quotes = quotes.map(quote => {
                    let rank = 0.0;
                    util.toWords(quote.content).forEach(word => {
                        if (quoteGlossary[word]) { //todo: figure out why there are quotes whose util.toWords is not a subset of quoteGlossary
                            rank += (recentGlossary[word] || 0.0) / quoteGlossary[word];
                        }
                    });
                    timeRatio = !parseInt(quote.called_at) ? 1 : ((Date.now() - parseInt(quote.called_at)) / (Date.now() - minTime));
                    rank = timeRatio * Math.pow(rank, e);
                    weightSum += rank;
                    return {value: quote, weight: rank};
                }).map(quote => {
                    let processedWeight = p * quote.weight / weightSum + (1 - p) / quotes.length;
                    return {value: quote.value, weight: processedWeight};
                });

                quotes.sort((a,b) => b.weight - a.weight); // sort and report quotes for debug purposes
                for (let i = 0; i < Math.min(5, quotes.length); i++) console.log("[relevant_quotes]: " + quotes[i].value.content + ": " + quotes[i].weight);
                let quote = util.weightedRandom(quotes);
                sendQuote(message.channel, quote.content, quote.nickname);
            });
        });
    }
}