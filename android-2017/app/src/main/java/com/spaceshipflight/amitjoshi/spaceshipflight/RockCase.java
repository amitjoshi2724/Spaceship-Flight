package com.spaceshipflight.amitjoshi.spaceshipflight;

import java.util.LinkedList;

/**
 * Created by amitjoshi on 12/23/16.
 */
public class RockCase{
    private LinkedList<Rock> list;
    public RockCase(){
        list = new LinkedList<Rock>();
    }
    public LinkedList<Rock> getList(){
        return list;
    }
    public synchronized void add(Rock b){
        list.add(b);
    }
    public synchronized void tick(){
        try {
            for (Rock r : list) {
                r.tick();
            }
        }
        catch(Exception e){}
    }
    public synchronized void remove(Rock b){
        list.remove(b);
    }
}

