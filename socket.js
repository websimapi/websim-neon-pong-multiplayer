// Singleton WebsimSocket
export const room = new WebsimSocket();
export const initRoom = async () => {
    await room.initialize();
};