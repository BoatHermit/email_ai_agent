from fastapi import Header, HTTPException, status


def get_current_user_id(x_user_id: str = Header(None)) -> str:
    """
    简易示例：从请求头 X-User-Id 解析当前用户。
    在生产中应替换为 JWT/Session 验证，并在此处返回 user/tenant 信息。
    """
    if not x_user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing X-User-Id header")
    return x_user_id
