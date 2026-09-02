import os
import sys

if __name__ == "__main__":
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    os.chdir(backend_dir)
    sys.path.insert(0, backend_dir)
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
