package com.leansofx.qaserviceuser.auth;

import java.io.Serializable;

public record SessionIdentity(String role, String accountId, Object profile) implements Serializable {}
