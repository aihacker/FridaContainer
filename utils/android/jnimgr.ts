/**
 * @author: xingjun.xyf
 * @contact: deathmemory@163.com
 * @file: jnimgr.js
 * @time: 2020/6/18 5:14 PM
 * @desc:
 */
import {FCCommon} from "../FCCommon"
import {DMLog} from "../dmlog";

const jni = require('./jni_struct');

export class Jni {
    static getJNIAddr(name: string) {
        var env = Java.vm.getEnv();
        var env_ptr = env.handle.readPointer();
        const addr = jni.getJNIFunctionAdress(env_ptr, name);
        DMLog.d('Jni.getJNIAddr', 'addr: ' + addr);
        return addr;
    }

    static hookJNI(name: string, callbacksOrProbe: InvocationListenerCallbacks | InstructionProbeCallback,
                   data?: NativePointerValue) {
        const addr = Jni.getJNIAddr(name);
        return Interceptor.attach(addr, callbacksOrProbe);
    }

    static hook_registNatives() {

        var env = Java.vm.getEnv();
        var handlePointer = env.handle.readPointer();
        console.log("handle: " + handlePointer);
        var nativePointer = handlePointer.add(215 * Process.pointerSize).readPointer();
        console.log("register: " + nativePointer);
        /**
         typedef struct {
            const char* name;
            const char* signature;
            void* fnPtr;
         } JNINativeMethod;
         jint RegisterNatives(JNIEnv* env, jclass clazz, const JNINativeMethod* methods, jint nMethods)
         */
        Interceptor.attach(nativePointer, {
            onEnter: function (args) {
                var env = Java.vm.getEnv();
                var p_size = Process.pointerSize;
                var methods = args[2];
                var methodcount = args[3].toInt32();
                var name = env.getClassName(args[1]);
                console.log("==== class: " + name + " ====");

                console.log("==== methods: " + methods + " nMethods: " + methodcount + " ====");
                for (var i = 0; i < methodcount; i++) {

                    var idx = i * p_size * 3;
                    var fnPtr = methods.add(idx + p_size * 2).readPointer();
                    const module = FCCommon.getModuleByAddr(fnPtr);
                    if (module) {
                        const modulename = module.name;
                        const modulebase = module.base;
                        var logstr = "name: " + methods.add(idx).readPointer().readCString()
                            + ", signature: " + methods.add(idx + p_size).readPointer().readCString()
                            + ", fnPtr: " + fnPtr
                            + ", modulename: " + modulename + " -> base: " + modulebase;
                        if (null != modulebase) {
                            logstr += ", offset: " + fnPtr.sub(modulebase);
                        }
                        DMLog.i('hook_registNatives', logstr);
                    }
                    else {
                        DMLog.e('hook_registNatives', 'module is null');
                    }
                }

            }
        });
    }
}