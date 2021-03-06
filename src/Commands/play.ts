import { Player, QueryType, Track } from "discord-player";
import { Guild, GuildResolvable, Message, MessageEmbed } from "discord.js";
import { formatTime } from "../Utils/formatTime";

// todo: add features such as audio effects (from discord-player)
export async function play(message: Message, player: Player) {
	try {
		// Checking conditions
		if (!message.member || !message.guild || !message.guild.me)
			return message.channel.send("An unknown error has occured");
		if (!message.member.voice.channel)
			return message.channel.send("You need to be in a voice channel to play music!");
		if (!message.member.voice.channel.permissionsFor(message.guild.me).has("CONNECT"))
			return message.channel.send(
				"I need the permission to be able to join your voice channel!"
			);
		if (!message.member.voice.channel.permissionsFor(message.guild.me).has("SPEAK"))
			return message.channel.send(
				"I need the permission for speaking in your voice channel!"
			);

		// Splices message to remove the ({prefix}play )
		const query = message.content.slice(6);
		const searchResult = await player.search(query, {
			requestedBy: message.member.user,
			searchEngine: QueryType.AUTO
		});
		if (!searchResult || !searchResult.tracks.length)
			return message.channel.send("No results were found!");

		// tries to connect to user's channel
		const queue = player.createQueue(message.guild, {
			metadata: message.channel
		});
		if (!queue.connection)
			await queue.connect(message.member.voice.channel).catch((err) => {
				player.deleteQueue(message.guild as Guild); // message.guild cannot be null, line 9
				message.channel.send(
					"I can't join your channel, please make sure that I have the correct permission"
				);
				message.channel.send(`Here is the error "***${err.message}***"`);
			});

		if (
			message.member.voice.channelId &&
			message.member.voice.channelId !== message.guild.me.voice.channelId
		)
			return message.channel.send(
				"You can only play songs you are in the same voice channel as the bot"
			);

		// Adds all tracks in playlist / adds track and then plays it if it isn't already playing
		// todo: known bug: only adds returns 100 tracks
		// todo: add payment system for returning more than 100 tracks (proper connect to spotify API)
		if (searchResult.playlist) {
			queue.addTracks(searchResult.tracks);
			if (!queue.playing) await queue.play();
			return message.channel.send({
				embeds: [
					new MessageEmbed()
						.setColor("#CBC3E3")
						.setTitle(`Playlist Added: **${searchResult.playlist.title}**`)
						.setURL(searchResult.playlist.url)
						.setAuthor(
							searchResult.playlist.author.name,
							"",
							searchResult.playlist.author.url
						)
						.setDescription(searchResult.playlist.description)
						.setThumbnail(searchResult.playlist.thumbnail)
						.addField("Playlist Length", formatTime(searchResult.tracks))
						.setImage(searchResult.tracks[0].thumbnail)
						.setImage("https://imgur.com/xKu5k82")
						.setTimestamp()
						.setFooter(
							`This message was requested by ${message.author.username}`,
							message.author.avatarURL() as string
						)
				]
			});
		} else {
			queue.addTrack(searchResult.tracks[0]);
			if (!queue.playing) await queue.play();
			return message.channel.send({
				embeds: [
					new MessageEmbed()
						.setColor("#CBC3E3")
						.setTitle(`Song Added: **${searchResult.tracks[0].title}**`)
						.setURL(searchResult.tracks[0].url)
						.setAuthor(searchResult.tracks[0].author, "", searchResult.tracks[0].url)
						.addField("Track Length", searchResult.tracks[0].duration)
						.setImage(searchResult.tracks[0].thumbnail)
						.setTimestamp()
						.setFooter(
							`This message was requested by ${message.author.username}`,
							message.author.avatarURL() as string
						)
				]
			});
		}
	} catch (err: any) {
		message.channel.send("Something went wrong, please try to play a different track");
		message.channel.send(`Here is the error "***${err.message}***"`);
	}
}
