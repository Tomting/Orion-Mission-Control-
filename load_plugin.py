def load_plugin(name):
    mod = __import__("%s" % name)
    return mod

def call_plugin(name, *args, **kwargs):
    plugin = load_plugin(name)
    plugin.plugin_main(*args, **kwargs)

call_plugin("test_plugin", 1234)
