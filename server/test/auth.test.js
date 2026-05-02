import { after, before, test } from "node:test";
import assert from "node:assert/strict";

let server;
let baseUrl;
let prisma;

before(async () => {
  const [{ default: app }, prismaModule] = await Promise.all([
    import("../src/app.js"),
    import("../src/lib/prisma.js")
  ]);

  prisma = prismaModule.prisma;

  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}/api`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  if (prisma) {
    await prisma.$disconnect();
  }
});

async function apiRequest(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  let body = null;

  try {
    body = await response.json();
  } catch (_error) {
    body = null;
  }

  return {
    status: response.status,
    body
  };
}

test("auth flow enforces JWT session validation and three active devices", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
  const username = `auth_user_${suffix}`;
  const email = `${username}@example.com`;
  const password = "Passw0rd!";

  const registerResult = await apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password
    })
  });

  assert.equal(registerResult.status, 201);
  assert.equal(registerResult.body.user.username, username);

  const createdUser = await prisma.user.findUnique({
    where: {
      email
    }
  });

  assert.ok(createdUser);
  assert.notEqual(createdUser.passwordHash, password);
  assert.match(createdUser.passwordHash, /^\$2[aby]\$/);

  const loginResults = [];

  for (let index = 0; index < 4; index += 1) {
    const loginResult = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        account: email,
        password
      })
    });

    assert.equal(loginResult.status, 200);
    assert.ok(loginResult.body.token);
    assert.ok(loginResult.body.deviceId);
    loginResults.push(loginResult.body);

    await new Promise((resolve) => setTimeout(resolve, 20));
  }

  const firstSessionMe = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${loginResults[0].token}`
    }
  });
  const latestSessionMe = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${loginResults[3].token}`
    }
  });

  assert.equal(firstSessionMe.status, 401);
  assert.equal(latestSessionMe.status, 200);
  assert.equal(latestSessionMe.body.user.email, email);

  const activeSessions = await prisma.userSession.count({
    where: {
      userId: createdUser.id,
      isActive: true
    }
  });

  assert.equal(activeSessions, 3);

  const logoutResult = await apiRequest("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${loginResults[3].token}`
    }
  });

  assert.equal(logoutResult.status, 200);

  const meAfterLogout = await apiRequest("/auth/me", {
    headers: {
      Authorization: `Bearer ${loginResults[3].token}`
    }
  });

  assert.equal(meAfterLogout.status, 401);

  await prisma.user.delete({
    where: {
      id: createdUser.id
    }
  });
});
