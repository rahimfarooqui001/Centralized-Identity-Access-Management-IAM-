import redisClient from "../config/redisSession.js";

//  Key builder
const getKey = (userId) => `user_sessions:${userId}`;


//  Add session
export const addUserSession = async (userId, sessionId) => {
  await redisClient.sAdd(getKey(userId), sessionId);
};


//  Remove session
export const removeUserSession = async (userId, sessionId) => {
  await redisClient.sRem(getKey(userId), sessionId);
};


//  Get all sessions
export const getUserSessions = async (userId) => {
  return await redisClient.sMembers(getKey(userId));
};


//  Delete all sessions 
export const deleteAllUserSessions = async (userId) => {
  await redisClient.del(getKey(userId));
};


//  Check ownership
export const isSessionOwnedByUser = async (userId, sessionId) => {
  return await redisClient.sIsMember(getKey(userId), sessionId);
};